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
        type: 'info' as const,
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
    res.status(500).json({ error: "Failed to save feedback" });
  }
});

export default router;