import { Router } from "express";
import { db } from "@db";
import { feedback } from "@db/schema";
import { z } from "zod";
import { sendEmail } from "../services/email";
import { createNotification, NotificationTypes } from "../services/notifications";

const router = Router();

// Define feedback schema
const feedbackSchema = z.object({
  type: z.enum(["bug", "feedback"]),
  description: z.string().min(1),
  screenshot: z.string().nullable(),
  technicalContext: z.record(z.any()),
  path: z.string(),
  notifyEmail: z.string().email().optional(),
  notifyAdmins: z.boolean().optional()
});

router.post("/api/feedback", async (req, res) => {
  try {
    // Validate request body
    const validatedData = feedbackSchema.parse(req.body);
    const { type, description, screenshot, technicalContext, path, notifyEmail, notifyAdmins } = validatedData;
    const userId = req.user?.id;

    // Store feedback in database
    const [result] = await db.insert(feedback).values({
      type,
      description,
      screenshot,
      technical_context: technicalContext,
      path,
      user_id: userId,
    }).returning();

    // Send email notification if requested
    if (notifyEmail) {
      await sendEmail({
        to: notifyEmail,
        subject: `New ${type} Report - Zecko Platform`,
        html: `
          <h2>New ${type} Report</h2>
          <p><strong>Description:</strong> ${description}</p>
          <p><strong>User:</strong> ${technicalContext.userEmail}</p>
          <p><strong>Path:</strong> ${path}</p>
          <p><strong>Technical Context:</strong></p>
          <pre>${JSON.stringify(technicalContext, null, 2)}</pre>
        `,
        text: `New ${type} Report\n\nDescription: ${description}\nUser: ${technicalContext.userEmail}\nPath: ${path}\nTechnical Context: ${JSON.stringify(technicalContext, null, 2)}`
      });
    }

    // Create admin notification if requested
    if (notifyAdmins) {
      const truncatedMessage = description.length > 100 
        ? description.substring(0, 100) + "..." 
        : description;

      await createNotification({
        title: `New ${type} Report`,
        message: truncatedMessage,
        type: NotificationTypes.INFO,
        metadata: {
          feedbackId: result.id,
          feedbackType: type,
          path
        },
        notifyAdmins: true
      });
    }

    res.status(201).json(result);
  } catch (error) {
    console.error("Failed to save feedback:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: "Failed to save feedback" });
  }
});

export default router;