import { db } from '@db';
import { notifications, type InsertNotification } from '@db/schema';
import { eq } from 'drizzle-orm';

export async function createNotification(
  notification: Omit<InsertNotification, 'id' | 'createdAt' | 'read'>
): Promise<boolean> {
  try {
    await db.insert(notifications).values(notification);
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
        eq(notifications.id, notificationId) &&
        eq(notifications.userId, userId)
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
        eq(notifications.userId, userId) &&
        eq(notifications.read, false)
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
        notifications.createdAt < cutoffDate &&
        notifications.read === true
      );

    return true;
  } catch (error) {
    console.error('Error deleting old notifications:', error);
    return false;
  }
}
