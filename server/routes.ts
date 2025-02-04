import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { leads, products, leadResponses, subscriptions, users } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { log } from "./vite";
import { calculateMatchScore, sortBusinessesByMatch } from "./utils/matching";
import type { InferSelectModel } from "drizzle-orm";
import type { SessionData } from "express-session";

type Lead = InferSelectModel<typeof leads>;
type User = InferSelectModel<typeof users>;

declare module "express-session" {
  interface SessionData {
    passport?: {
      user?: number;
    };
  }
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Authentication middleware with enhanced session validation
  app.use('/api', (req, res, next) => {
    // Skip auth check for public routes
    const publicPaths = ['/login', '/register', '/auth/verify'];
    if (publicPaths.some(path => req.path.endsWith(path)) || req.method === 'OPTIONS') {
      return next();
    }

    // Enhanced session verification with detailed logging
    log(`Session verification - Path: ${req.path}`);
    log(`Session ID: ${req.sessionID}`);
    log(`Session Data: ${JSON.stringify(req.session)}`);
    log(`Is Authenticated: ${req.isAuthenticated()}`);
    log(`User: ${JSON.stringify(req.user)}`);
    log(`Passport Session: ${JSON.stringify(req.session?.passport)}`);

    // Less strict session validation - only check authentication
    if (!req.isAuthenticated()) {
      log(`Not authenticated - Path: ${req.path}, Session ID: ${req.sessionID}`);
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!req.user) {
      log(`No user in request - Path: ${req.path}`);
      return res.status(401).json({ message: 'No user found' });
    }

    next();
  });

  app.get("/api/auth/verify", (req, res) => {
    if (req.isAuthenticated() && req.user) {
      log(`Verified auth for user: ${req.user.id}, Session: ${req.sessionID}`);
      res.json({ 
        authenticated: true, 
        user: req.user,
        sessionId: req.sessionID 
      });
    } else {
      log(`Auth verification failed - Session: ${req.sessionID}`);
      res.status(401).json({ authenticated: false });
    }
  });

  app.post("/api/leads", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      log(`Creating lead - User: ${req.user.id}, Session: ${req.sessionID}`);
      log(`Request body: ${JSON.stringify(req.body)}`);

      const lead = await db.insert(leads).values({
        ...req.body,
        userId: req.user.id,
      }).returning();

      log(`Lead created successfully - ID: ${lead[0].id}`);
      res.json(lead[0]);
    } catch (error) {
      log(`Lead creation error: ${error}`);
      res.status(500).json({ message: "Failed to create lead" });
    }
  });
  // Subscription Routes
  app.post("/api/subscriptions", async (req, res) => {
    if (!req.user || !["business", "vendor"].includes(req.user.userType)) {
      return res.status(403).json({ message: "Invalid user type for subscription" });
    }

    try {
      const subscription = await db.insert(subscriptions).values({
        userId: req.user.id,
        tier: req.user.userType as "business" | "vendor",
        status: "active",
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        autoRenew: true,
        price: req.user.userType === "business" ? 2999 : 4999, // prices in cents
      }).returning();

      await db.update(users)
        .set({
          subscriptionActive: true,
          subscriptionTier: req.user.userType as "business" | "vendor",
          subscriptionEndsAt: subscription[0].endDate,
        })
        .where(eq(users.id, req.user.id));

      res.json(subscription[0]);
    } catch (error) {
      log(`Subscription creation error: ${error}`);
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  app.get("/api/subscriptions/current", async (req, res) => {
    if (!req.user) return res.sendStatus(401)
    const [subscription] = await db.select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, req.user.id),
          eq(subscriptions.status, "active")
        )
      )
      .orderBy(subscriptions.startDate)
      .limit(1);

    res.json(subscription || null);
  });

  app.post("/api/subscriptions/cancel", async (req, res) => {
    if(!req.user) return res.sendStatus(401);
    const [subscription] = await db.update(subscriptions)
      .set({ status: "cancelled" })
      .where(
        and(
          eq(subscriptions.userId, req.user.id),
          eq(subscriptions.status, "active")
        )
      )
      .returning();

    if (subscription) {
      await db.update(users)
        .set({
          subscriptionActive: false,
          subscriptionTier: "none",
        })
        .where(eq(users.id, req.user.id));
    }

    res.json(subscription || null);
  });

  app.get("/api/leads", async (req, res) => {
    if(!req.user) return res.sendStatus(401);
    try {
      const allLeads = await db.query.leads.findMany({
        with: {
          user: true,
          responses: {
            with: {
              business: true,
            },
          },
        },
      });

      if (req.user.userType === "business") {
        // For business users, sort leads by match score
        const sortedLeads = allLeads.map(lead => ({
          ...lead,
          matchScore: calculateMatchScore(lead, req.user),
        }))
          .sort((a, b) => (b.matchScore?.totalScore || 0) - (a.matchScore?.totalScore || 0));

        return res.json(sortedLeads);
      }

      res.json(allLeads);
    } catch (error) {
      log(`Leads retrieval error: ${error}`);
      res.status(500).json({ message: "Failed to retrieve leads" });
    }
  });

  // Products Routes
  app.post("/api/products", async (req, res) => {
    if (!req.user || req.user.userType !== "vendor" || !req.user.subscriptionActive) {
      return res.sendStatus(401);
    }
    const product = await db.insert(products).values({
      ...req.body,
      vendorId: req.user.id,
    }).returning();
    res.json(product[0]);
  });

  app.get("/api/products", async (req, res) => {
    const allProducts = await db.query.products.findMany({
      with: {
        vendor: true,
      },
    });
    res.json(allProducts);
  });

  // Lead Responses Routes
  app.post("/api/leads/:leadId/responses", async (req, res) => {
      if (!req.user || req.user.userType !== "business" || !req.user.subscriptionActive) {
          return res.sendStatus(401);
      }
    const response = await db.insert(leadResponses).values({
      ...req.body,
      leadId: parseInt(req.params.leadId),
      businessId: req.user.id,
    }).returning();
    res.json(response[0]);
  });

  app.patch("/api/leads/:leadId/responses/:responseId", async (req, res) => {
      if(!req.user) return res.sendStatus(401);
    const [lead] = await db.select().from(leads).where(eq(leads.id, parseInt(req.params.leadId)));
    if (!lead || lead.userId !== req.user.id) return res.sendStatus(403);

    const [response] = await db.update(leadResponses)
      .set({ status: req.body.status })
      .where(
        and(
          eq(leadResponses.id, parseInt(req.params.responseId)),
          eq(leadResponses.leadId, parseInt(req.params.leadId))
        )
      )
      .returning();
    res.json(response);
  });

  // Add route for businesses to update their matching preferences
  app.patch("/api/users/matching-preferences", async (req, res) => {
    if (!req.user || req.user.userType !== "business") {
      return res.status(403).json({ message: "Only business users can update matching preferences" });
    }

    try {
      const [updatedUser] = await db.update(users)
        .set({
          profile: {
            ...req.user.profile,
            matchPreferences: req.body,
          },
        })
        .where(eq(users.id, req.user.id))
        .returning();

      res.json(updatedUser);
    } catch (error) {
      log(`Matching preferences update error: ${error}`);
      res.status(500).json({ message: "Failed to update matching preferences" });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}