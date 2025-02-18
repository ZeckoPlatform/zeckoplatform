import { Router } from "express";
import { db } from "@db";
import { leads } from "@db/schema";
import { importLeadsFromRSS, importLeadsFromAPI } from "../services/external-leads";
import { z } from "zod";

const router = Router();

const PHONE_PATTERNS = {
  GB: /^\+44\s*\d+$/,  // Simplified pattern to match +44 followed by any digits
  US: /^\+1\s*\d+$/,  // Simplified pattern to match +1 followed by any digits
};

// Schema for lead creation
const createLeadSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  budget: z.number().min(0, "Budget must be a positive number").optional(),
  location: z.string().optional(),
  phoneNumber: z.string()
    .regex(PHONE_PATTERNS.GB, "Invalid UK phone number format. Must start with +44")
    .or(z.string().regex(PHONE_PATTERNS.US, "Invalid US phone number format. Must start with +1"))
    .optional(),
  expires_at: z.string().datetime().optional().default(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30); // Default expiry of 30 days
    return date.toISOString();
  }),
});

// Create a new lead
router.post("/api/leads", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    console.log("Received lead data:", req.body);

    const validatedData = createLeadSchema.parse({
      ...req.body,
      budget: req.body.budget ? Number(req.body.budget) : undefined
    });

    console.log("Validated lead data:", validatedData);

    // Extract only the fields that exist in the leads table
    const { subcategory, phoneNumber, ...leadData } = validatedData;

    const newLead = await db.insert(leads).values({
      ...leadData,
      user_id: req.user.id,
      region: req.user.countryCode || "GB", // Default to GB if not specified
    }).returning();

    res.json(newLead[0]);
  } catch (error) {
    console.error("Lead creation failed:", error);
    if (error instanceof z.ZodError) {
      console.log("Validation errors:", error.errors);
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