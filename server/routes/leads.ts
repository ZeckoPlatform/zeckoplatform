import { Router } from "express";
import { db } from "@db";
import { leads } from "@db/schema";
import { z } from "zod";

const router = Router();

// Schema for lead creation
const createLeadSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  budget: z.number().min(0, "Budget must be a positive number").or(z.string().transform(val => Number(val))),
  location: z.string().min(1, "Location is required"),
});

// Create a new lead
router.post("/api/leads", async (req, res) => {
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
    expiryDate.setDate(expiryDate.getDate() + 30); // 30 days from now

    const insertData = {
      user_id: req.user.id,
      title: validatedData.title,
      description: validatedData.description,
      category: validatedData.category,
      budget: validatedData.budget,
      location: validatedData.location,
      region: req.user.countryCode || "GB",
      status: "open",
      expires_at: expiryDate,
    };

    console.log("Attempting to insert lead with data:", JSON.stringify(insertData, null, 2));

    const newLead = await db.insert(leads).values(insertData).returning();

    console.log("Successfully created lead:", JSON.stringify(newLead[0], null, 2));
    res.json(newLead[0]);
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

export default router;