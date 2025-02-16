import { Router } from "express";
import { db } from "@db";
import { feedback, feedbackResponses } from "@db/schema";
import { z } from "zod";
import { sendEmail } from "../services/email";
import { createNotification, NotificationTypes } from "../services/notifications";
import { eq } from "drizzle-orm";

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
router.post("/api/feedback", async (req, res) => {
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

    // Create automated response
    await db.insert(feedbackResponses).values({
      feedback_id: feedbackEntry.id,
      content: type === "bug" 
        ? "Thank you for reporting this bug. Our team has been notified and will investigate the issue." 
        : "Thank you for your feedback. We appreciate your input in helping us improve our platform.",
      response_type: "automated",
    });

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

    res.setHeader('Content-Type', 'application/json');
    return res.status(201).json({ 
      success: true, 
      data: feedbackEntry 
    });
  } catch (error) {
    console.error("Failed to save feedback:", error);

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

// Admin routes for feedback management
router.get("/api/admin/feedback", async (req, res) => {
  try {
    const feedbackList = await db.query.feedback.findMany({
      with: {
        responses: true,
        user: true,
      },
      orderBy: (feedback, { desc }) => [desc(feedback.created_at)],
    });

    return res.json(feedbackList);
  } catch (error) {
    console.error("Failed to fetch feedback:", error);
    return res.status(500).json({ message: "Failed to fetch feedback" });
  }
});

router.patch("/api/admin/feedback/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const [updated] = await db
      .update(feedback)
      .set({ 
        status, 
        updated_at: new Date() 
      })
      .where(eq(feedback.id, parseInt(id)))
      .returning();

    return res.json(updated);
  } catch (error) {
    console.error("Failed to update feedback status:", error);
    return res.status(500).json({ message: "Failed to update feedback status" });
  }
});

router.post("/api/admin/feedback/:id/respond", async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const adminId = req.user?.id;

  try {
    const [response] = await db.insert(feedbackResponses).values({
      feedback_id: parseInt(id),
      admin_id: adminId,
      content,
      response_type: "admin",
    }).returning();

    // Update the feedback status to 'acknowledged' if it's still 'new'
    await db
      .update(feedback)
      .set({ 
        status: "acknowledged", 
        updated_at: new Date() 
      })
      .where(eq(feedback.id, parseInt(id)))
      .where(eq(feedback.status, "new"));

    return res.json(response);
  } catch (error) {
    console.error("Failed to add feedback response:", error);
    return res.status(500).json({ message: "Failed to add feedback response" });
  }
});

export default router;