import { Router } from "express";
import { db } from "@db";
import { leads, messages, leadResponses } from "@db/schema";
import { z } from "zod";
import { eq, and, isNull } from "drizzle-orm";
import { calculateMatchScore } from "../utils/matching";

const router = Router();

const createLeadSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  budget: z.string()
    .min(1, "Budget is required")
    .transform(val => parseFloat(val))
    .refine(val => !isNaN(val) && val >= 0, "Budget must be a valid positive number"),
  location: z.string().min(1, "Location is required"),
  phone_number: z.string().optional().nullable()
});

router.get("/leads", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    console.log("Fetching leads for user:", req.user.id, "type:", req.user.userType);

    if (req.user.userType === 'free') {
      // Free users see their own leads
      const userLeads = await db
        .select()
        .from(leads)
        .where(
          and(
            eq(leads.user_id, req.user.id),
            isNull(leads.deleted_at)
          )
        )
        .orderBy(leads.created_at);

      console.log("Found leads for free user:", userLeads.length);
      return res.json(userLeads);
    } else {
      // Business users see leads from free users, filtered by match score
      const allLeads = await db
        .select()
        .from(leads)
        .where(
          and(
            isNull(leads.deleted_at),
            eq(leads.status, 'open')
          )
        )
        .orderBy(leads.created_at);

      // Filter and sort leads based on match score
      const matchedLeads = allLeads
        .map(lead => ({
          lead,
          score: calculateMatchScore(lead, req.user)
        }))
        .filter(({ score }) => score.totalScore > 0) // Only show leads with some match
        .sort((a, b) => b.score.totalScore - a.score.totalScore)
        .map(({ lead }) => lead);

      console.log("Found matching leads for business:", matchedLeads.length);
      return res.json(matchedLeads);
    }
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

    const validatedData = createLeadSchema.parse(req.body);

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

    // First check if the lead exists and belongs to the user
    const [lead] = await db
      .select()
      .from(leads)
      .where(and(
        eq(leads.id, leadId),
        eq(leads.user_id, req.user.id),
        isNull(leads.deleted_at)
      ));

    if (!lead) {
      console.log(`Lead ${leadId} not found or does not belong to user ${req.user.id}`);
      return res.status(404).json({ error: "Lead not found" });
    }

    // Soft delete the lead
    await db
      .update(leads)
      .set({
        deleted_at: new Date()
      })
      .where(and(
        eq(leads.id, leadId),
        eq(leads.user_id, req.user.id)
      ));

    console.log(`Successfully soft deleted lead: ${leadId}`);
    res.json({ message: "Lead deleted successfully" });
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

    const validatedData = createLeadSchema.partial().parse(req.body);

    console.log(`Attempting to update lead ${leadId} with data:`, validatedData);

    const [existingLead] = await db
      .select()
      .from(leads)
      .where(and(
        eq(leads.id, leadId),
        eq(leads.user_id, req.user.id)
      ));

    if (!existingLead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const [updatedLead] = await db
      .update(leads)
      .set(validatedData)
      .where(and(
        eq(leads.id, leadId),
        eq(leads.user_id, req.user.id)
      ))
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

// Add new proposal submission route
const proposalSchema = z.object({
  proposal: z.string().min(1, "Proposal text is required"),
});

router.post("/leads/:id/responses", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const leadId = parseInt(req.params.id);
    if (isNaN(leadId)) {
      return res.status(400).json({ error: "Invalid lead ID" });
    }

    // Validate proposal data
    const validatedData = proposalSchema.parse(req.body);

    // Check if lead exists and is open
    const [lead] = await db
      .select()
      .from(leads)
      .where(
        and(
          eq(leads.id, leadId),
          isNull(leads.deleted_at),
          eq(leads.status, 'open')
        )
      );

    if (!lead) {
      return res.status(404).json({ error: "Lead not found or not available" });
    }

    // Check if user has already submitted a proposal
    const [existingResponse] = await db
      .select()
      .from(leadResponses)
      .where(
        and(
          eq(leadResponses.lead_id, leadId),
          eq(leadResponses.business_id, req.user.id)
        )
      );

    if (existingResponse) {
      return res.status(400).json({ error: "You have already submitted a proposal for this lead" });
    }

    // Create new proposal
    const [newResponse] = await db
      .insert(leadResponses)
      .values({
        lead_id: leadId,
        business_id: req.user.id,
        proposal: validatedData.proposal,
        status: 'pending'
      })
      .returning();

    console.log("Created new proposal response:", newResponse);
    res.status(201).json(newResponse);
  } catch (error) {
    console.error("Failed to submit proposal:", error);
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
      error: "Failed to submit proposal",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;