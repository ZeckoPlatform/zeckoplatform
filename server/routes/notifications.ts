import { Router } from "express";
import { authenticateToken, checkSuperAdminAccess } from "../auth";
import { db } from "@db";
import { notifications, notificationPreferences, emailTemplates, newsletters, users } from "@db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createNotification, markNotificationAsRead, getUnreadNotifications } from "../services/notifications";
import { sendEmail } from "../services/email";

const router = Router();

// Add test notification endpoint
router.post("/notifications/test", authenticateToken, checkSuperAdminAccess, async (req, res) => {
  try {
    const { type, message, severity } = req.body;

    // Create the test notification
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
      global.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(notification));
        }
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error creating test notification:", error);
    res.status(500).json({ error: "Failed to create test notification" });
  }
});

// Email template routes - Admin only
router.post("/email-templates", authenticateToken, checkAdminAccess, async (req, res) => {
  try {
    const [template] = await db
      .insert(emailTemplates)
      .values(req.body)
      .returning();

    return res.status(201).json(template);
  } catch (error) {
    console.error("Error creating email template:", error);
    return res.status(500).json({ error: "Failed to create email template" });
  }
});

router.get("/email-templates", authenticateToken, checkAdminAccess, async (req, res) => {
  try {
    const templates = await db
      .select()
      .from(emailTemplates)
      .orderBy(emailTemplates.createdAt);

    return res.json(templates);
  } catch (error) {
    console.error("Error fetching email templates:", error);
    return res.status(500).json({ error: "Failed to fetch email templates" });
  }
});

// Newsletter routes - Admin only
router.post("/newsletters", authenticateToken, checkAdminAccess, async (req, res) => {
  try {
    const { templateId, subject, content, scheduledFor } = req.body;

    const [newsletter] = await db
      .insert(newsletters)
      .values({
        subject,
        content,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        templateId,
      })
      .returning();

    if (req.body.sendNow) {
      // Send newsletter immediately to all active users
      const activeUsers = await db
        .select({
          email: users.email,
        })
        .from(users)
        .where(eq(users.active, true));

      for (const user of activeUsers) {
        await sendEmail({
          to: user.email,
          subject: newsletter.subject,
          html: newsletter.content,
          text: newsletter.content.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
        });
      }
    }

    return res.status(201).json(newsletter);
  } catch (error) {
    console.error("Error creating/sending newsletter:", error);
    return res.status(500).json({ error: "Failed to create/send newsletter" });
  }
});

router.get("/newsletters", authenticateToken, checkAdminAccess, async (req, res) => {
  try {
    const newsletters = await db
      .select()
      .from(newsletters)
      .orderBy(newsletters.createdAt);

    return res.json(newsletters);
  } catch (error) {
    console.error("Error fetching newsletters:", error);
    return res.status(500).json({ error: "Failed to fetch newsletters" });
  }
});

// Notification routes
router.get("/notifications", authenticateToken, async (req, res) => {
  try {
    const unreadNotifications = await getUnreadNotifications(req.user!.id);
    return res.json(unreadNotifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

router.patch("/notifications/:id/read", authenticateToken, async (req, res) => {
  try {
    const success = await markNotificationAsRead(
      parseInt(req.params.id),
      req.user!.id
    );

    if (!success) {
      return res.status(404).json({ error: "Notification not found" });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

// Notification preferences routes
router.get("/notification-preferences", authenticateToken, async (req, res) => {
  try {
    const [preferences] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.user_id, req.user!.id))
      .limit(1);

    if (!preferences) {
      // Create default preferences if none exist
      const [newPreferences] = await db
        .insert(notificationPreferences)
        .values({
          user_id: req.user!.id,
          renewal_reminder: true,
          reminder_days_before: 7,
          invoice_available: true,
          payment_failed: true,
        })
        .returning();

      return res.json(newPreferences);
    }

    return res.json(preferences);
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return res.status(500).json({ error: "Failed to fetch notification preferences" });
  }
});

router.patch("/notification-preferences", authenticateToken, async (req, res) => {
  try {
    const [updatedPreferences] = await db
      .update(notificationPreferences)
      .set(req.body)
      .where(eq(notificationPreferences.user_id, req.user!.id))
      .returning();

    return res.json(updatedPreferences);
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return res.status(500).json({ error: "Failed to update notification preferences" });
  }
});

// Middleware to check admin access
const checkAdminAccess = (req, res, next) => {
  if (!req.user || req.user.userType !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

export default router;