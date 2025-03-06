import { Router } from "express";
import { authenticateToken, checkSuperAdminAccess } from "../auth";
import { db } from "@db";
import { notifications } from "@db/schema";
import { eq } from "drizzle-orm";
import { WebSocket } from 'ws';
import { sendEmail } from "../services/email";

const router = Router();

// Global WebSocket server reference
declare global {
  var wss: any;
}

// Add test notification endpoint
router.post("/notifications/test", authenticateToken, checkSuperAdminAccess, async (req, res) => {
  try {
    const { type, message, severity } = req.body;

    // Create notification in database
    const [notification] = await db
      .insert(notifications)
      .values({
        userId: req.user!.id,
        title: `Test ${type.toUpperCase()} Notification`,
        message,
        type: 'test',
        read: false,
        metadata: {
          severity,
          test: true,
          timestamp: new Date().toISOString()
        }
      })
      .returning();

    // Send real-time notification via WebSocket
    if (global.wss) {
      global.wss.clients.forEach((client: WebSocket) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(notification));
        }
      });
    }

    // Send email for critical notifications
    if (severity === 'critical' && req.user?.email) {
      await sendEmail({
        to: req.user.email,
        subject: `[CRITICAL] Test Notification`,
        text: message,
        html: `<h2>Critical Test Notification</h2><p>${message}</p>`
      });
    }

    res.status(200).json({ success: true, notification });
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