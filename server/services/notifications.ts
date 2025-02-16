import { db } from '@db';
import { notifications, users } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Define the notification types
export const NotificationTypes = {
  INFO: "info",
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "error",
} as const;

export type NotificationType = typeof NotificationTypes[keyof typeof NotificationTypes];

const notificationSchema = z.object({
  userId: z.union([z.number(), z.array(z.number())]).optional(),
  title: z.string(),
  message: z.string(),
  type: z.enum(["info", "success", "warning", "error"]).default("info"),
  link: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  notifyAdmins: z.boolean().optional()
});

export type CreateNotificationInput = z.infer<typeof notificationSchema>;

export async function createNotification(
  notification: CreateNotificationInput
): Promise<boolean> {
  try {
    // Log incoming notification data
    console.log('Incoming notification data:', JSON.stringify(notification, null, 2));

    // Validate the notification data
    const validatedData = notificationSchema.parse(notification);
    console.log('Validated notification data:', JSON.stringify(validatedData, null, 2));

    // If notifyAdmins is true, get all admin user IDs
    if (validatedData.notifyAdmins) {
      const adminUsers = await db
        .select()
        .from(users)
        .where(eq(users.userType, "admin"));

      console.log('Found admin users:', adminUsers);

      // Create a notification for each admin
      for (const admin of adminUsers) {
        try {
          const notificationData = {
            userId: admin.id,
            title: validatedData.title,
            message: validatedData.message,
            type: validatedData.type,
            link: validatedData.link,
            metadata: validatedData.metadata,
            read: false,
          };
          console.log('Inserting notification for admin:', JSON.stringify(notificationData, null, 2));

          const result = await db.insert(notifications).values(notificationData);
          console.log('Insert result:', result);
        } catch (insertError) {
          console.error('Error inserting notification for admin:', insertError);
          throw insertError;
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
        try {
          const notificationData = {
            userId: uid,
            title: validatedData.title,
            message: validatedData.message,
            type: validatedData.type,
            link: validatedData.link,
            metadata: validatedData.metadata,
            read: false,
          };
          console.log('Inserting notification for user:', JSON.stringify(notificationData, null, 2));

          const result = await db.insert(notifications).values(notificationData);
          console.log('Insert result:', result);
        } catch (insertError) {
          console.error('Error inserting notification for user:', insertError);
          throw insertError;
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error in createNotification:', error);
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