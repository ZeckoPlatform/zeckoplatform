import { db } from '@db';
import { notifications } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Define the notification schema
const notificationSchema = z.object({
  type: z.enum(["info", "success", "warning", "error"]),
  title: z.string(),
  message: z.string(),
  userId: z.number().array().optional(), // Allow array of userIds for admin notifications
  metadata: z.record(z.any()).optional(),
  notifyAdmins: z.boolean().optional()
});

export type CreateNotificationInput = z.infer<typeof notificationSchema>;

export async function createNotification(
  notification: CreateNotificationInput
): Promise<boolean> {
  try {
    // Validate the notification data
    const validatedData = notificationSchema.parse(notification);

    // If notifyAdmins is true, get all admin user IDs
    if (validatedData.notifyAdmins) {
      const adminUsers = await db.query.users.findMany({
        where: (users) => eq(users.userType, "admin"),
        columns: { id: true }
      });

      // Create a notification for each admin
      for (const admin of adminUsers) {
        await db.insert(notifications).values({
          type: validatedData.type,
          title: validatedData.title,
          message: validatedData.message,
          metadata: validatedData.metadata || {},
          userId: admin.id,
          read: false,
          createdAt: new Date()
        });
      }
      return true;
    }

    // For regular notifications to specific users
    if (validatedData.userId) {
      for (const uid of Array.isArray(validatedData.userId) ? validatedData.userId : [validatedData.userId]) {
        await db.insert(notifications).values({
          type: validatedData.type,
          title: validatedData.title,
          message: validatedData.message,
          metadata: validatedData.metadata || {},
          userId: uid,
          read: false,
          createdAt: new Date()
        });
      }
    }

    return true;
  } catch (error) {
    console.error('Error creating notification:', error);
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
    console.error('Error marking notification as read:', error);
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
    console.error('Error fetching unread notifications:', error);
    return [];
  }
}

export async function deleteOldNotifications(daysToKeep = 30): Promise<boolean> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    await db
      .delete(notifications)
      .where(
        and(
          notifications.createdAt < cutoffDate,
          eq(notifications.read, true)
        )
      );

    return true;
  } catch (error) {
    console.error('Error deleting old notifications:', error);
    return false;
  }
}