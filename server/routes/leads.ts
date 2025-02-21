import { Router } from "express";
import { db } from "@db";
import { leads, messages, leadResponses } from "@db/schema";
import { z } from "zod";
import { eq, and, isNull, or } from "drizzle-orm";
import { calculateMatchScore } from "../utils/matching";
import { sql } from "drizzle-orm";

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
      // Free users see their own leads with responses and messages
      const userLeads = await db.execute(sql`
        SELECT 
          l.*,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', lr.id,
                'business_id', lr.business_id,
                'proposal', lr.proposal,
                'status', lr.status,
                'created_at', lr.created_at,
                'business', jsonb_build_object(
                  'id', u.id,
                  'profile', u.profile
                )
              )
            ) FILTER (WHERE lr.id IS NOT NULL),
            '[]'
          ) as responses,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', m.id,
                'sender_id', m.sender_id,
                'receiver_id', m.receiver_id,
                'content', m.content,
                'read', m.read,
                'created_at', m.created_at
              )
            ) FILTER (WHERE m.id IS NOT NULL),
            '[]'
          ) as messages
        FROM leads l
        LEFT JOIN lead_responses lr ON l.id = lr.lead_id AND lr.deleted_at IS NULL
        LEFT JOIN users u ON lr.business_id = u.id
        LEFT JOIN messages m ON l.id = m.lead_id
        WHERE l.user_id = ${req.user.id}
        AND l.deleted_at IS NULL
        GROUP BY l.id
        ORDER BY l.created_at DESC
      `);

      console.log("Found leads for free user:", userLeads.rows.length);
      return res.json(userLeads.rows);
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
          score: calculateMatchScore(lead, req.user!)
        }))
        .filter(({ score }) => score.totalScore > 0)
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

    // Update the lead status to cancelled instead of soft delete
    await db
      .update(leads)
      .set({ status: 'cancelled' })
      .where(and(
        eq(leads.id, leadId),
        eq(leads.user_id, req.user.id)
      ));

    console.log(`Successfully cancelled lead: ${leadId}`);
    res.json({ message: "Lead cancelled successfully" });
  } catch (error) {
    console.error("Failed to cancel lead:", error);
    res.status(500).json({
      error: "Failed to cancel lead",
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

// Update the proposal submission route with better validation and error handling
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
    console.log("Attempting to submit proposal for lead:", leadId, "by business:", req.user.id);

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
      console.log("Lead not found or not available:", leadId);
      return res.status(404).json({ error: "Lead not found or not available" });
    }

    // Check if user has an active proposal
    const [existingResponse] = await db
      .select()
      .from(leadResponses)
      .where(
        and(
          eq(leadResponses.lead_id, leadId),
          eq(leadResponses.business_id, req.user.id),
          eq(leadResponses.status, 'pending')
        )
      );

    if (existingResponse) {
      console.log("Active proposal exists for business:", req.user.id, "for lead:", leadId);
      return res.status(400).json({ error: "You already have an active proposal for this lead" });
    }

    // Create new proposal
    console.log("Creating new proposal for lead:", leadId, "by business:", req.user.id);
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

// Update the messaging route with better permission checks
router.post("/leads/:id/messages", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const leadId = parseInt(req.params.id);
    const { receiverId, content } = req.body;

    console.log("Message attempt - Lead:", leadId, "Sender:", req.user.id, "Receiver:", receiverId);

    if (!content?.trim()) {
      return res.status(400).json({ error: "Message content is required" });
    }

    // Verify the lead exists and get additional details
    const [lead] = await db
      .select()
      .from(leads)
      .where(
        and(
          eq(leads.id, leadId),
          isNull(leads.deleted_at)
        )
      );

    if (!lead) {
      console.log("Lead not found:", leadId);
      return res.status(404).json({ error: "Lead not found" });
    }

    // Get all responses for this lead
    const responses = await db
      .select()
      .from(leadResponses)
      .where(eq(leadResponses.lead_id, leadId));

    console.log("Found responses for lead:", responses.length);

    // Check messaging permissions
    let hasPermission = false;
    if (req.user.id === lead.user_id) {
      // Lead owner can message any business that has submitted a proposal
      hasPermission = responses.some(r => r.business_id === receiverId);
    } else {
      // Business can only message if they have submitted a proposal
      hasPermission = responses.some(r =>
        r.business_id === req.user.id && lead.user_id === receiverId
      );
    }

    if (!hasPermission) {
      console.log("Permission denied - Lead owner:", lead.user_id, "Sender:", req.user.id, "Receiver:", receiverId);
      return res.status(403).json({ error: "You don't have permission to message this user" });
    }

    // Create the message
    console.log("Creating message - Lead:", leadId, "Sender:", req.user.id, "Receiver:", receiverId);
    const [newMessage] = await db
      .insert(messages)
      .values({
        lead_id: leadId,
        sender_id: req.user.id,
        receiver_id: receiverId,
        content: content.trim(),
        read: false
      })
      .returning();

    console.log("Message created successfully:", newMessage);
    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Failed to send message:", error);
    res.status(500).json({
      error: "Failed to send message",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

router.post("/leads/:id/responses/:responseId/accept", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const leadId = parseInt(req.params.id);
    const responseId = parseInt(req.params.responseId);

    if (isNaN(leadId) || isNaN(responseId)) {
      return res.status(400).json({ error: "Invalid lead or response ID" });
    }

    // Verify the lead belongs to the user and exists
    const [lead] = await db
      .select()
      .from(leads)
      .where(
        and(
          eq(leads.id, leadId),
          eq(leads.user_id, req.user.id),
          isNull(leads.deleted_at)
        )
      );

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // Get the response
    const [response] = await db
      .select()
      .from(leadResponses)
      .where(
        and(
          eq(leadResponses.id, responseId),
          eq(leadResponses.lead_id, leadId)
        )
      );

    if (!response) {
      return res.status(404).json({ error: "Response not found" });
    }

    // Update response status to accepted
    const [updatedResponse] = await db
      .update(leadResponses)
      .set({
        status: 'accepted'
      })
      .where(eq(leadResponses.id, responseId))
      .returning();

    // Update lead status
    await db
      .update(leads)
      .set({
        status: 'in_progress'
      })
      .where(eq(leads.id, leadId));

    // Reject all other responses
    await db
      .update(leadResponses)
      .set({
        status: 'rejected'
      })
      .where(
        and(
          eq(leadResponses.lead_id, leadId),
          isNull(leadResponses.deleted_at),
          eq(leadResponses.status, 'pending'),
          isNull(leadResponses.deleted_at)
        )
      );

    res.json(updatedResponse);
  } catch (error) {
    console.error("Failed to accept proposal:", error);
    res.status(500).json({
      error: "Failed to accept proposal",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Add proposal rejection route
router.post("/leads/:id/responses/:responseId/reject", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const leadId = parseInt(req.params.id);
    const responseId = parseInt(req.params.responseId);

    if (isNaN(leadId) || isNaN(responseId)) {
      return res.status(400).json({ error: "Invalid lead or response ID" });
    }

    // Verify the lead belongs to the user and exists
    const [lead] = await db
      .select()
      .from(leads)
      .where(
        and(
          eq(leads.id, leadId),
          eq(leads.user_id, req.user.id),
          isNull(leads.deleted_at)
        )
      );

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // Get the response
    const [response] = await db
      .select()
      .from(leadResponses)
      .where(
        and(
          eq(leadResponses.id, responseId),
          eq(leadResponses.lead_id, leadId)
        )
      );

    if (!response) {
      return res.status(404).json({ error: "Response not found" });
    }

    // Update response status to rejected
    const [updatedResponse] = await db
      .update(leadResponses)
      .set({
        status: 'rejected'
      })
      .where(eq(leadResponses.id, responseId))
      .returning();

    res.json(updatedResponse);
  } catch (error) {
    console.error("Failed to reject proposal:", error);
    res.status(500).json({
      error: "Failed to reject proposal",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;