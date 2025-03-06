import { db } from '@db';
import { notifications, users } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { logInfo, logError } from './logging';
import { WebSocket } from 'ws';
import { sendEmail } from './email';

// Define global type for WebSocket server
declare global {
  var wss: WebSocket.Server;
}

// Define notification severity levels
export const SeverityLevels = {
  INFO: "info",
  WARNING: "warning",
  CRITICAL: "critical",
} as const;

// Define the notification types
export const NotificationTypes = {
  API_FAILURE: "api_failure",
  SYSTEM_METRIC: "system_metric",
  DATABASE_ISSUE: "database_issue",
  SECURITY_ALERT: "security_alert",
} as const;

export type SeverityLevel = typeof SeverityLevels[keyof typeof SeverityLevels];
export type NotificationType = typeof NotificationTypes[keyof typeof NotificationTypes];

// Store active WebSocket connections
const activeConnections: Map<number, WebSocket> = new Map();

const notificationSchema = z.object({
  userId: z.union([z.number(), z.array(z.number())]).optional(),
  title: z.string(),
  message: z.string(),
  type: z.enum(["api_failure", "system_metric", "database_issue", "security_alert", "bug_report", "customer_feedback"]),
  severity: z.enum(["info", "warning", "critical"]).default("info"),
  link: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  notifyAdmins: z.boolean().optional(),
  sendEmail: z.boolean().optional()
});

export type CreateNotificationInput = z.infer<typeof notificationSchema>;

// Register a new WebSocket connection for a user
export function registerWebSocket(userId: number, ws: WebSocket) {
  activeConnections.set(userId, ws);
  ws.on('close', () => activeConnections.delete(userId));
}

// Helper function to send real-time notification
async function sendRealTimeNotification(userId: number, notification: any) {
  const ws = activeConnections.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(notification));
  }
}

// Helper function to send email notification
async function sendEmailNotification(userId: number, notification: any) {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user?.email) {
      await sendEmail({
        to: user.email,
        subject: `[${notification.metadata?.severity?.toUpperCase() || 'ALERT'}] ${notification.title}`,
        text: notification.message,
        html: `<h2>${notification.title}</h2><p>${notification.message}</p>`,
      });
    }
  } catch (error) {
    logError('Failed to send email notification:', { error });
  }
}

export async function createNotification(
  notification: CreateNotificationInput
): Promise<boolean> {
  try {
    logInfo('Creating notification:', notification);

    const validatedData = notificationSchema.parse(notification);

    // Get admin users if notification should go to admins
    if (validatedData.notifyAdmins) {
      const adminUsers = await db
        .select()
        .from(users)
        .where(eq(users.userType, "admin"));

      for (const admin of adminUsers) {
        const notificationData = {
          userId: admin.id,
          title: validatedData.title,
          message: validatedData.message,
          type: validatedData.type,
          link: validatedData.link,
          metadata: {
            ...validatedData.metadata,
            severity: validatedData.severity,
          },
          read: false,
        };

        // Store in database
        const [savedNotification] = await db
          .insert(notifications)
          .values(notificationData)
          .returning();

        // Send real-time notification
        await sendRealTimeNotification(admin.id, savedNotification);

        // Send email for critical notifications
        if (validatedData.severity === 'critical' || validatedData.sendEmail) {
          await sendEmailNotification(admin.id, savedNotification);
        }
      }
      return true;
    }

    // For regular notifications to specific users
    if (validatedData.userId) {
      const userIds = Array.isArray(validatedData.userId) 
        ? validatedData.userId 
        : [validatedData.userId];

      for (const uid of userIds) {
        const notificationData = {
          userId: uid,
          title: validatedData.title,
          message: validatedData.message,
          type: validatedData.type,
          link: validatedData.link,
          metadata: {
            ...validatedData.metadata,
            severity: validatedData.severity,
          },
          read: false,
        };

        // Store in database
        const [savedNotification] = await db
          .insert(notifications)
          .values(notificationData)
          .returning();

        // Send real-time notification
        await sendRealTimeNotification(uid, savedNotification);

        // Send email for critical notifications
        if (validatedData.severity === 'critical' || validatedData.sendEmail) {
          await sendEmailNotification(uid, savedNotification);
        }
      }
    }

    return true;
  } catch (error) {
    logError('Error in createNotification:', error);
    return false;
  }
}

export async function markNotificationAsRead(
  notificationId: number,
  userId: number
): Promise<boolean> {
  try {
    const [notification] = await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        )
      )
      .returning();

    return !!notification;
  } catch (error) {
    logError('Error marking notification as read:', error);
    return false;
  }
}

export async function getUnreadNotifications(userId: number) {
  try {
    return await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.read, false)
        )
      )
      .orderBy(notifications.createdAt);
  } catch (error) {
    logError('Error fetching unread notifications:', error);
    return [];
  }
}

// Threshold monitoring
const API_FAILURE_THRESHOLD = 5; // Number of failures in monitoring period
const API_MONITORING_PERIOD = 5 * 60 * 1000; // 5 minutes in milliseconds
let apiFailureCount = 0;
let lastApiFailureReset = Date.now();

export function monitorApiFailure(error: Error) {
  const now = Date.now();

  // Reset counter if monitoring period has passed
  if (now - lastApiFailureReset > API_MONITORING_PERIOD) {
    apiFailureCount = 0;
    lastApiFailureReset = now;
  }

  apiFailureCount++;

  // Create notification if threshold is exceeded
  if (apiFailureCount >= API_FAILURE_THRESHOLD) {
    createNotification({
      title: "API Failure Alert",
      message: `High number of API failures detected: ${apiFailureCount} failures in the last 5 minutes.`,
      type: "api_failure",
      severity: "critical",
      notifyAdmins: true,
      sendEmail: true,
      metadata: {
        failureCount: apiFailureCount,
        lastError: error.message,
        timestamp: now
      }
    });

    // Reset counter after notification
    apiFailureCount = 0;
    lastApiFailureReset = now;
  }
}