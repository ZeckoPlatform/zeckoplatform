import { Router } from "express";
import { authenticateToken, checkSuperAdminAccess } from "../auth";
import { db } from "@db";
import { notifications, users } from "@db/schema";
import { eq } from "drizzle-orm";
import { WebSocket } from 'ws';
import { sendEmail } from "../services/email";
import { createNotification } from "../services/notifications";

const router = Router();

// Add test notification endpoint
router.post("/notifications/test", authenticateToken, checkSuperAdminAccess, async (req, res) => {
  try {
    const { type, message, severity } = req.body;

    const success = await createNotification({
      title: `Test ${severity.toUpperCase()} Alert`,
      message: message || `This is a test ${severity} notification`,
      type: severity === 'critical' ? 'api_failure' : 'system_metric',
      severity,
      notifyAdmins: true,
      sendEmail: severity === 'critical',
      metadata: {
        test: true,
        timestamp: new Date().toISOString()
      }
    });

    if (!success) {
      throw new Error("Failed to create notification");
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error creating test notification:", error);
    res.status(500).json({ error: "Failed to create test notification" });
  }
});

// Get notifications
router.get("/notifications", authenticateToken, async (req, res) => {
  try {
    const notifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, req.user!.id))
      .orderBy(notifications.createdAt);

    return res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Mark notification as read
router.patch("/notifications/:id/read", authenticateToken, async (req, res) => {
  try {
    const [notification] = await db
      .update(notifications)
      .set({ read: true })
      .where(
        eq(notifications.id, parseInt(req.params.id))
      )
      .returning();

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

export default router;