import { Router } from "express";
import { db } from "@db";
import { importLeadsFromRSS, importLeadsFromAPI } from "../services/external-leads";
import { z } from "zod";

const router = Router();

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
      // For API requests, use empty string if apiKey is not provided
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