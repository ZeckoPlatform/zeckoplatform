import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { leads, products, leadResponses, subscriptions, users } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { log } from "./vite";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Subscription Routes
  app.post("/api/subscriptions", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!["business", "vendor"].includes(req.user.userType)) {
      return res.status(403).json({ message: "Invalid user type for subscription" });
    }

    try {
      const subscription = await db.insert(subscriptions).values({
        userId: req.user.id,
        tier: req.user.userType,
        status: "active",
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        price: req.user.userType === "business" ? 2999 : 4999, // prices in cents
        autoRenew: true,
      }).returning();

      await db.update(users)
        .set({
          subscriptionActive: true,
          subscriptionTier: req.user.userType,
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
    if (!req.user) return res.sendStatus(401);

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
    if (!req.user) return res.sendStatus(401);

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

  // Leads Routes
  app.post("/api/leads", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const lead = await db.insert(leads).values({
      ...req.body,
      userId: req.user.id,
    }).returning();
    res.json(lead[0]);
  });

  app.get("/api/leads", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
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
    res.json(allLeads);
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
    if (!req.user) return res.sendStatus(401);
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

  const httpServer = createServer(app);
  return httpServer;
}