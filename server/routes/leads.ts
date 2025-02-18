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
  subcategory: z.string().optional(),
  budget: z.number().min(0, "Budget must be a positive number"),
  location: z.string().min(1, "Location is required"),
  phoneNumber: z.string().optional().nullable(),
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
      budget: req.body.budget ? Number(req.body.budget) : undefined
    });

    console.log("Validated lead data:", JSON.stringify(validatedData, null, 2));

    const newLead = await db.insert(leads).values({
      title: validatedData.title,
      description: validatedData.description,
      category: validatedData.category,
      subcategory: validatedData.subcategory || null,
      budget: validatedData.budget,
      location: validatedData.location,
      phone_number: validatedData.phoneNumber,
      user_id: req.user.id,
      region: req.user.countryCode || "GB",
      status: "open" as const,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    }).returning();

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
    res.status(500).json({ error: "Failed to create lead" });
  }
});

// Schema for importing leads from external sources
const importSourceSchema = z.object({
  type: z.enum(["rss", "api"]),
  url: z.string().url(),
  apiKey: z.string().optional(),
});

router.post("/api/leads/import", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Check if user is super admin
    if (!req.user.superAdmin) {
      return res.status(403).json({ error: "Only super admins can import leads" });
    }

    const validatedData = importSourceSchema.parse(req.body);
    let importedLeads;

    if (validatedData.type === "rss") {
      importedLeads = await importLeadsFromRSS(validatedData.url, req.user.id);
    } else {
      importedLeads = await importLeadsFromAPI(
        validatedData.url,
        validatedData.apiKey || "",
        req.user.id
      );
    }

    res.json({ success: true, leads: importedLeads });
  } catch (error) {
    console.error("Lead import failed:", error);
    res.status(400).json({ 
      error: error instanceof z.ZodError 
        ? error.errors[0].message 
        : "Failed to import leads" 
    });
  }
});

export default router;