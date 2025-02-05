import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { setupAuth, authenticateToken } from "./auth";
import { db } from "@db";
import { leads, users } from "@db/schema";
import { eq } from "drizzle-orm";
import { log } from "./vite";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  app.use('/api', (req, res, next) => {
    if (req.path.endsWith('/login') || 
        req.path.endsWith('/register') || 
        req.path.endsWith('/auth/verify') || 
        req.method === 'OPTIONS') {
      return next();
    }
    authenticateToken(req, res, next);
  });

  // POST /api/leads - Create a new lead
  app.post("/api/leads", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      log(`Creating lead for user ${req.user.id} (${req.user.userType})`);

      if (req.user.userType !== "free") {
        return res.status(403).json({ message: "Only free users can create leads" });
      }

      const newLead = {
        user_id: req.user.id,
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        budget: parseInt(req.body.budget),
        location: req.body.location,
        status: "open" as const,
      };

      log(`Attempting to create lead: ${JSON.stringify(newLead)}`);

      const [lead] = await db.insert(leads)
        .values(newLead)
        .returning();

      log(`Lead created successfully: ${JSON.stringify(lead)}`);
      res.status(201).json(lead);
    } catch (error) {
      log(`Lead creation error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Full error:', error);
      res.status(500).json({ 
        message: "Failed to create lead",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // GET /api/leads - Get all leads
  app.get("/api/leads", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      log(`Fetching leads for user ${req.user.id} (${req.user.userType})`);

      let query = db.select().from(leads);

      // If user is "free", only show their own leads
      if (req.user.userType === "free") {
        query = query.where(eq(leads.user_id, req.user.id));
      }

      const fetchedLeads = await query;
      log(`Successfully fetched ${fetchedLeads.length} leads`);

      res.json(fetchedLeads);
    } catch (error) {
      log(`Leads fetch error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Full error:', error);
      res.status(500).json({ 
        message: "Failed to fetch leads",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
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

  app.post("/api/products", async (req, res) => {
    try {
      if (!req.user || req.user.userType !== "vendor" || !req.user.subscriptionActive) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const product = await db.insert(products).values({
        ...req.body,
        vendorId: req.user.id,
      }).returning();

      res.json(product[0]);
    } catch (error) {
      log(`Product creation error: ${error}`);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.get("/api/products", async (req, res) => {
    try {
      const allProducts = await db.query.products.findMany({
        with: {
          vendor: true,
        },
      });
      res.json(allProducts);
    } catch (error) {
      log(`Products retrieval error: ${error}`);
      res.status(500).json({ message: "Failed to retrieve products" });
    }
  });

  app.post("/api/leads/:leadId/responses", async (req, res) => {
    try {
      if (!req.user || req.user.userType !== "business" || !req.user.subscriptionActive) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const response = await db.insert(leadResponses).values({
        ...req.body,
        leadId: parseInt(req.params.leadId),
        businessId: req.user.id,
      }).returning();

      res.json(response[0]);
    } catch (error) {
      log(`Lead response creation error: ${error}`);
      res.status(500).json({ message: "Failed to create lead response" });
    }
  });

  app.patch("/api/leads/:leadId/responses/:responseId", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const [lead] = await db.select()
        .from(leads)
        .where(eq(leads.id, parseInt(req.params.leadId)));

      if (!lead || lead.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

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
    } catch (error) {
      log(`Lead response update error: ${error}`);
      res.status(500).json({ message: "Failed to update lead response" });
    }
  });

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