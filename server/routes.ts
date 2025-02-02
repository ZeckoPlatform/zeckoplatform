import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { leads, products, leadResponses } from "@db/schema";
import { eq, and } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

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
    if (!req.user || req.user.userType !== "vendor") return res.sendStatus(401);
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
    if (!req.user || req.user.userType !== "business") return res.sendStatus(401);
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
