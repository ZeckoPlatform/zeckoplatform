import { Router } from "express";
import { authenticateToken, checkSuperAdminAccess } from "../auth";
import { db } from "@db";
import { notifications, users } from "@db/schema";
import { eq } from "drizzle-orm";
import { WebSocket } from 'ws';
import { sendEmail } from "../services/email";

const router = Router();

// Add test notification endpoint
router.post("/notifications/test", authenticateToken, checkSuperAdminAccess, async (req, res) => {
  try {
    const { type, message, severity } = req.body;

    // Get admin user for email
    const [admin] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user!.id));

    // Create notification in database
    const [notification] = await db
      .insert(notifications)
      .values({
        userId: req.user!.id,
        title: `Test ${severity.toUpperCase()} Alert`,
        message: message || `This is a test ${severity} notification`,
        type: severity === 'critical' ? 'bug_report' : 'customer_feedback',
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
    if (severity === 'critical' && admin?.email) {
      await sendEmail({
        to: admin.email,
        subject: `[CRITICAL] System Alert`,
        text: message || `This is a test critical notification`,
        html: `<h2>Critical System Alert</h2><p>${message || 'This is a test critical notification'}</p>`
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