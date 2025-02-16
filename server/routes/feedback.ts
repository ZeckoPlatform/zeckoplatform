import { Router } from "express";
import { db } from "@db";
import { feedback } from "@db/schema";
import { sendEmail } from "../services/email";
import { createNotification } from "../services/notifications";

const router = Router();

router.post("/api/feedback", async (req, res) => {
  const { type, description, screenshot, technicalContext, path, notifyEmail, notifyAdmins } = req.body;
  const userId = req.user?.id;

  try {
    // Store feedback in database
    const [result] = await db.insert(feedback).values({
      type,
      description,
      screenshot,
      technical_context: technicalContext,
      path,
      user_id: userId,
      created_at: new Date(),
    }).returning();

    // Send email notification
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
        text: `New ${type} Report

Description: ${description}
User: ${technicalContext.userEmail}
Path: ${path}
Technical Context: ${JSON.stringify(technicalContext, null, 2)}
        `
      });
    }

    // Create admin notification
    if (notifyAdmins) {
      const truncatedMessage = description.length > 100 
        ? description.substring(0, 100) + "..." 
        : description;

      await createNotification({
        type: "info",
        title: `New ${type} Report`,
        message: truncatedMessage,
        metadata: {
          feedbackId: result.id,
          feedbackType: type
        },
        notifyAdmins: true // This will automatically notify all admin users
      });
    }

    res.status(201).json(result);
  } catch (error) {
    console.error("Failed to save feedback:", error);
    res.status(500).json({ error: "Failed to save feedback" });
  }
});

export default router;