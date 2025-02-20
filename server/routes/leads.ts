import { Router } from "express";
import { db } from "@db";
import { leads, messages, leadResponses } from "@db/schema";
import { z } from "zod";
import { eq } from "drizzle-orm";

const router = Router();

const createLeadSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  budget: z.number().min(0, "Budget must be a positive number").or(z.string().transform(val => Number(val))),
  location: z.string().min(1, "Location is required"),
  phone_number: z.string().optional().nullable()
});

router.get("/leads", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    console.log("Fetching leads for user:", req.user.id);

    const userLeads = await db.select()
      .from(leads)
      .where(eq(leads.user_id, req.user.id))
      .orderBy(leads.created_at);

    console.log("Found leads:", userLeads.length);

    return res.json(userLeads);
  } catch (error) {
    console.error("Error fetching leads:", error);
    return res.status(500).json({ 
      error: "Failed to fetch leads",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

router.post("/leads", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    console.log("Received lead creation request with body:", JSON.stringify(req.body, null, 2));

    const validatedData = createLeadSchema.parse({
      ...req.body,
      budget: typeof req.body.budget === 'string' ? Number(req.body.budget) : req.body.budget
    });

    console.log("Validated lead data:", JSON.stringify(validatedData, null, 2));

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); 

    const insertData = {
      user_id: req.user.id,
      title: validatedData.title,
      description: validatedData.description,
      category: validatedData.category,
      subcategory: validatedData.subcategory || null,
      budget: validatedData.budget,
      location: validatedData.location,
      phone_number: validatedData.phone_number || null,
      region: req.user.countryCode || "GB",
      status: "open" as const,
      expires_at: expiryDate,
    };

    console.log("Attempting to insert lead with data:", JSON.stringify(insertData, null, 2));

    const [newLead] = await db.insert(leads).values(insertData).returning();

    console.log("Successfully created lead:", JSON.stringify(newLead, null, 2));
    res.json(newLead);
  } catch (error) {
    console.error("Lead creation failed. Error details:", error);
    if (error instanceof z.ZodError) {
      console.error("Validation errors:", JSON.stringify(error.errors, null, 2));
      return res.status(400).json({ 
        error: "Validation failed", 
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }
    res.status(500).json({ 
      error: "Failed to create lead", 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.delete("/leads/:id", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const leadId = parseInt(req.params.id);
    if (isNaN(leadId)) {
      return res.status(400).json({ error: "Invalid lead ID" });
    }

    console.log(`Attempting to delete lead ${leadId} for user ${req.user.id}`);

    const [lead] = await db.select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .where(eq(leads.user_id, req.user.id));

    if (!lead) {
      console.log(`Lead ${leadId} not found or does not belong to user ${req.user.id}`);
      return res.status(404).json({ error: "Lead not found" });
    }

    // Delete related records in the correct order
    await db.delete(messages)
      .where(eq(messages.lead_id, leadId));

    await db.delete(leadResponses)
      .where(eq(leadResponses.lead_id, leadId));

    const [deletedLead] = await db.delete(leads)
      .where(eq(leads.id, leadId))
      .where(eq(leads.user_id, req.user.id))
      .returning();

    console.log(`Successfully deleted lead:`, deletedLead);
    res.json({ message: "Lead deleted successfully", lead: deletedLead });
  } catch (error) {
    console.error("Failed to delete lead:", error);
    res.status(500).json({
      error: "Failed to delete lead",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

router.patch("/leads/:id", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const leadId = parseInt(req.params.id);
    if (isNaN(leadId)) {
      return res.status(400).json({ error: "Invalid lead ID" });
    }

    const validatedData = createLeadSchema.partial().parse({
      ...req.body,
      budget: req.body.budget ? Number(req.body.budget) : undefined
    });

    console.log(`Attempting to update lead ${leadId} with data:`, validatedData);

    const [existingLead] = await db.select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .where(eq(leads.user_id, req.user.id));

    if (!existingLead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const [updatedLead] = await db.update(leads)
      .set(validatedData)
      .where(eq(leads.id, leadId))
      .where(eq(leads.user_id, req.user.id))
      .returning();

    console.log("Successfully updated lead:", updatedLead);
    res.json(updatedLead);
  } catch (error) {
    console.error("Failed to update lead:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }
    res.status(500).json({
      error: "Failed to update lead",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;