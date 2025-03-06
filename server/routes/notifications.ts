import { Router } from "express";
import { authenticateToken, checkSuperAdminAccess } from "../auth";
import { db } from "@db";
import { notifications } from "@db/schema";
import { eq } from "drizzle-orm";
import { WebSocket } from 'ws';
import { sendEmail } from "../services/email";
import { logInfo, logError } from "../services/logging";
import { addLogEntry } from "./analytics";

const router = Router();

// Add test notification endpoint
router.post("/notifications/test", authenticateToken, checkSuperAdminAccess, async (req, res) => {
  try {
    const { severity = 'info', message } = req.body;

    // Log the test notification attempt
    addLogEntry({
      '@timestamp': new Date().toISOString(),
      level: severity as 'info' | 'warning' | 'error',
      message: message || `Test ${severity} notification`,
      service: 'notifications',
      category: 'test',
      metadata: {
        userId: req.user?.id,
        severity,
        test: true
      }
    });

    // Create notification
    const [notification] = await db
      .insert(notifications)
      .values({
        userId: req.user!.id,
        title: `Test ${severity.toUpperCase()} Notification`,
        message: message || `This is a test ${severity} notification`,
        type: severity === 'critical' ? 'error' : 'info',
        read: false,
        createdAt: new Date(),
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
      try {
        await sendEmail({
          to: req.user.email,
          subject: `[CRITICAL] Test Alert`,
          text: message || 'This is a test critical notification',
          html: `<h2>Critical Test Alert</h2><p>${message || 'This is a test critical notification'}</p>`
        });
      } catch (emailError) {
        logError('Failed to send notification email:', emailError);

        // Log email failure
        addLogEntry({
          '@timestamp': new Date().toISOString(),
          level: 'error',
          message: 'Failed to send notification email',
          service: 'email',
          category: 'notification',
          metadata: { error: emailError }
        });
      }
    }

    res.status(200).json({ success: true, notification });
  } catch (error) {
    // Log the error
    logError("Error creating test notification:", error);

    // Add to analytics logs
    addLogEntry({
      '@timestamp': new Date().toISOString(),
      level: 'error',
      message: 'Failed to create test notification',
      service: 'notifications',
      category: 'test',
      metadata: { error }
    });

    res.status(500).json({ error: "Failed to create test notification" });
  }
});

// Get notifications
router.get("/notifications", authenticateToken, async (req, res) => {
  try {
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, req.user!.id))
      .orderBy(notifications.createdAt);

    return res.json(userNotifications);
  } catch (error) {
    logError("Error fetching notifications:", error);

    // Add to analytics logs
    addLogEntry({
      '@timestamp': new Date().toISOString(),
      level: 'error',
      message: 'Failed to fetch notifications',
      service: 'notifications',
      category: 'query',
      metadata: { error }
    });

    return res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Mark notification as read
router.patch("/notifications/:id/read", authenticateToken, async (req, res) => {
  try {
    const [notification] = await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, parseInt(req.params.id)))
      .returning();

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    return res.json({ success: true });
  } catch (error) {
    logError("Error marking notification as read:", error);

    // Add to analytics logs
    addLogEntry({
      '@timestamp': new Date().toISOString(),
      level: 'error',
      message: 'Failed to mark notification as read',
      service: 'notifications',
      category: 'update',
      metadata: { error }
    });

    return res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

export default router;