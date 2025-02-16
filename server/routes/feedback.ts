import { Router } from "express";
import { db } from "@db";
import { feedback } from "@db/schema";
import { sendEmail } from "../services/email";
import { createAdminNotification } from "../services/notifications";

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
        text: `
Type: ${type}
Description: ${description}
User: ${technicalContext.userEmail}
Path: ${path}
Technical Context: ${JSON.stringify(technicalContext, null, 2)}
        `,
      });
    }

    // Create admin notification
    if (notifyAdmins) {
      await createAdminNotification({
        title: `New ${type} Report`,
        message: `${technicalContext.userEmail} submitted a ${type} report: ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}`,
        type: 'feedback',
        metadata: {
          feedbackId: result.id,
          feedbackType: type,
        }
      });
    }

    res.status(201).json(result);
  } catch (error) {
    console.error("Failed to save feedback:", error);
    res.status(500).json({ error: "Failed to save feedback" });
  }
});

export default router;