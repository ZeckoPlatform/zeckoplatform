import { db } from '@db';
import { notifications } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Define the notification schema
const notificationSchema = z.object({
  type: z.enum(['error', 'info', 'success', 'warning']),
  title: z.string(),
  message: z.string(),
  userId: z.number().optional(),
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

    await db.insert(notifications).values({
      ...validatedData,
      read: false,
      created_at: new Date()
    });
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