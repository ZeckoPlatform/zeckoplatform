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

// Remove authentication requirement for feedback submission
router.post("/", async (req, res) => {
  try {
    console.log('Received feedback request:', JSON.stringify(req.body, null, 2));

    // Validate request body
    const validatedData = feedbackSchema.parse(req.body);
    const { type, description, screenshot, technicalContext, path, notifyEmail, notifyAdmins } = validatedData;

    // Make user_id optional
    const userId = req.user?.id || null;

    // Store feedback in database
    const [feedbackEntry] = await db.insert(feedback).values({
      type,
      description,
      screenshot,
      technical_context: technicalContext,
      path,
      user_id: userId,
    }).returning();

    console.log('Feedback stored successfully:', JSON.stringify(feedbackEntry, null, 2));

    // Send email notification if requested
    if (notifyEmail) {
      try {
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
      } catch (emailError) {
        console.error('Error sending email notification:', emailError);
      }
    }

    // Create admin notification if requested
    if (notifyAdmins) {
      try {
        const truncatedMessage = description.length > 100 
          ? description.substring(0, 100) + "..." 
          : description;

        await createNotification({
          title: `New ${type} Report`,
          message: truncatedMessage,
          type: NotificationTypes.INFO,
          metadata: {
            feedbackId: feedbackEntry.id,
            feedbackType: type,
            path
          },
          notifyAdmins: true
        });
      } catch (notificationError) {
        console.error('Error creating admin notification:', notificationError);
      }
    }

    // Always set Content-Type header to application/json
    res.setHeader('Content-Type', 'application/json');
    return res.status(201).json({ 
      success: true, 
      data: feedbackEntry 
    });
  } catch (error) {
    console.error("Failed to save feedback:", error);

    // Always set Content-Type header to application/json
    res.setHeader('Content-Type', 'application/json');

    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        message: error.errors[0].message 
      });
    }

    return res.status(500).json({ 
      success: false, 
      message: "Failed to save feedback. Please try again." 
    });
  }
});

export default router;