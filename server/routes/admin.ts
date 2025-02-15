import { Router } from "express";
import { authenticateToken } from "../auth";
import { db } from "@db";
import { users, documents, subscriptions, products, leads, messages } from "@db/schema";
import { eq, and, count, sum, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { sendEmail } from "../services/email";

const router = Router();
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Middleware to check super admin access
const checkSuperAdminAccess = (req: any, res: any, next: any) => {
  if (!req.user || !req.user.superAdmin) {
    return res.status(403).json({ message: "Super admin access required" });
  }
  next();
};

// Create user account (super admin only)
router.post("/admin/users/create", authenticateToken, checkSuperAdminAccess, async (req, res) => {
  try {
    const {
      email,
      password,
      userType,
      businessType,
      businessName,
      companyNumber,
      utrNumber
    } = req.body;

    console.log('Creating user with data:', {
      email,
      userType,
      businessType,
      businessName,
      companyNumber,
      utrNumber
    });

    // Check if user with email already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    // Generate username from email
    const username = email.split('@')[0];

    // Hash password
    const hashedPassword = await hashPassword(password);

    try {
      // Create new user
      const [newUser] = await db.insert(users).values({
        email,
        username,
        password: hashedPassword,
        userType,
        businessType: businessType || null,
        businessName: businessName || null,
        companyNumber: companyNumber || null,
        utrNumber: utrNumber || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        superAdmin: false,
        profile: null,
        verificationCode: null,
        resetPasswordToken: null,
        resetPasswordExpiry: null,
      }).returning();

      console.log('User created:', newUser);

      // If creating a business or vendor account, create initial subscription
      if ((userType === "business" || userType === "vendor") && newUser?.id) {
        try {
          const subscription = await db.insert(subscriptions).values({
            userId: newUser.id, // Now we have the user ID
            status: "active",
            type: userType,
            price: userType === "business" ? 2999 : 4999, // Price in pence
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            stripeSubscriptionId: null,
            stripeCustomerId: null,
            stripePriceId: null,
            stripePaymentMethodId: null,
          }).returning();

          console.log('Subscription created:', subscription[0]);
        } catch (subscriptionError) {
          console.error("Error creating subscription:", subscriptionError);
          // Don't fail the whole operation if subscription creation fails
          // Just log it and continue
        }
      }

      return res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      return res.status(500).json({ error: "Failed to create user" });
    }
  } catch (error) {
    console.error("Error in user creation route:", error);
    return res.status(500).json({ error: "Failed to process request" });
  }
});

// Get admin statistics
router.get("/admin/stats", authenticateToken, checkSuperAdminAccess, async (req, res) => {
  try {
    // Get total users count
    const [userStats] = await db
      .select({ count: count() })
      .from(users);

    // Get documents count
    const [docStats] = await db
      .select({ count: count() })
      .from(documents);

    // Get active subscriptions count - include both paid and admin-granted
    const [subStats] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"));

    // Calculate total revenue from paid subscriptions only (exclude admin-granted ones)
    const [revenue] = await db
      .select({ total: sum(subscriptions.price) })
      .from(subscriptions)
      .where(and(
        eq(subscriptions.status, "active"),
        eq(subscriptions.auto_renew, true), // Only count paid subscriptions
        sql`price > 0` // Additional check to ensure we only count paid subscriptions
      ));

    const totalRevenue = revenue?.total ? Number(revenue.total) / 100 : 0;

    res.json({
      totalUsers: userStats.count || 0,
      totalDocuments: docStats.count || 0,
      activeSubscriptions: subStats.count || 0,
      totalRevenue: Math.floor(totalRevenue),
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ error: "Failed to fetch admin statistics" });
  }
});

// Get all users
router.get("/users", authenticateToken, checkSuperAdminAccess, async (req, res) => {
  try {
    const allUsers = await db
      .select()
      .from(users);

    return res.json(allUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get single user
router.get("/users/:userId", authenticateToken, checkSuperAdminAccess, async (req, res) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(req.params.userId)))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Update subscription (super admin only)
router.post("/admin/users/:userId/subscription", authenticateToken, checkSuperAdminAccess, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { subscriptionType } = req.body;

    console.log('Updating subscription:', { userId, subscriptionType });

    if (!["free", "business", "vendor"].includes(subscriptionType)) {
      return res.status(400).json({ error: "Invalid subscription type" });
    }

    // Check if user exists
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log('Found user:', targetUser);

    // Cancel any existing subscription
    await db
      .update(subscriptions)
      .set({ status: "cancelled" })
      .where(eq(subscriptions.user_id, userId));

    const subscriptionEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    if (subscriptionType !== "free") {
      // Create subscription with auto_renew false to indicate admin-granted
      const subscriptionData = {
        user_id: userId,
        tier: subscriptionType,
        status: "active",
        price: 0, // Set price to 0 for admin-granted subscriptions
        start_date: new Date(),
        end_date: subscriptionEndDate,
        auto_renew: false
      };

      console.log('Creating new subscription:', subscriptionData);

      await db.insert(subscriptions).values(subscriptionData);
    }

    // Update user subscription status
    const [updatedUser] = await db
      .update(users)
      .set({
        userType: subscriptionType,
        subscriptionActive: subscriptionType !== "free",
        subscriptionTier: subscriptionType === "free" ? "none" : subscriptionType,
        subscriptionEndsAt: subscriptionType === "free" ? null : subscriptionEndDate
      })
      .where(eq(users.id, userId))
      .returning();

    console.log('Updated user subscription status:', {
      userType: updatedUser.userType,
      subscriptionActive: updatedUser.subscriptionActive,
      subscriptionTier: updatedUser.subscriptionTier,
      subscriptionEndsAt: updatedUser.subscriptionEndsAt
    });

    return res.json(updatedUser);
  } catch (error) {
    console.error("Error updating subscription:", error);
    return res.status(500).json({ error: "Failed to update subscription" });
  }
});

// Get all admins
router.get("/admins", authenticateToken, checkSuperAdminAccess, async (req, res) => {
  try {
    const adminUsers = await db
      .select()
      .from(users)
      .where(eq(users.userType, "admin"));

    return res.json(adminUsers);
  } catch (error) {
    console.error("Error fetching admins:", error);
    return res.status(500).json({ error: "Failed to fetch admins" });
  }
});

// Reset user password (super admin only)
router.post("/admin/users/:userId/reset-password", authenticateToken, checkSuperAdminAccess, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    // Check if user exists and is not a super admin
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (targetUser.superAdmin) {
      return res.status(403).json({ error: "Cannot reset super admin password" });
    }

    // Generate a temporary password
    const temporaryPassword = randomBytes(8).toString("hex");
    const hashedPassword = await hashPassword(temporaryPassword);

    // Update the user's password
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));

    return res.json({
      message: "Password reset successful",
      temporaryPassword // This will be shown to the super admin
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).json({ error: "Failed to reset password" });
  }
});


// Grant admin access to a user
router.post("/admins/:userId", authenticateToken, checkSuperAdminAccess, async (req, res) => {
  try {
    const [updatedUser] = await db
      .update(users)
      .set({ userType: "admin" })
      .where(eq(users.id, parseInt(req.params.userId)))
      .returning();

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(updatedUser);
  } catch (error) {
    console.error("Error granting admin access:", error);
    return res.status(500).json({ error: "Failed to grant admin access" });
  }
});

// Revoke admin access from a user
router.delete("/admins/:userId", authenticateToken, checkSuperAdminAccess, async (req, res) => {
  try {
    // Prevent revoking super admin's admin status
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(req.params.userId)))
      .limit(1);

    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (targetUser.superAdmin) {
      return res.status(403).json({ error: "Cannot revoke admin access from super admin" });
    }

    const [updatedUser] = await db
      .update(users)
      .set({ userType: "free" })
      .where(eq(users.id, parseInt(req.params.userId)))
      .returning();

    return res.json(updatedUser);
  } catch (error) {
    console.error("Error revoking admin access:", error);
    return res.status(500).json({ error: "Failed to revoke admin access" });
  }
});

// Update user details (super admin only)
router.patch("/users/:userId", authenticateToken, checkSuperAdminAccess, async (req, res) => {
  try {
    const [updatedUser] = await db
      .update(users)
      .set(req.body)
      .where(eq(users.id, parseInt(req.params.userId)))
      .returning();

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ error: "Failed to update user" });
  }
});

// Delete user (super admin only)
router.delete("/users/:userId", authenticateToken, checkSuperAdminAccess, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    // Prevent deleting super admin
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (targetUser.superAdmin) {
      return res.status(403).json({ error: "Cannot delete super admin account" });
    }

    const [deletedUser] = await db
      .delete(users)
      .where(eq(users.id, userId))
      .returning();

    return res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({ error: "Failed to delete user" });
  }
});

// Update the mass email endpoint to use AWS SES
router.post("/admin/mass-email", authenticateToken, checkSuperAdminAccess, async (req, res) => {
  try {
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: "Subject and message are required" });
    }

    // Get all users' emails
    const allUsers = await db
      .select({
        email: users.email,
        username: users.username
      })
      .from(users);

    console.log(`Attempting to send mass email to ${allUsers.length} users`);

    const emailPromises = allUsers.map(user => {
      const personalizedHtml = message.replace(/\n/g, '<br>')
        .replace('{{username}}', user.username);

      return sendEmail({
        to: user.email,
        subject: subject,
        text: message.replace('{{username}}', user.username),
        html: personalizedHtml
      });
    });

    // Wait for all emails to be sent
    const results = await Promise.allSettled(emailPromises);

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failureCount = allUsers.length - successCount;

    console.log(`Mass email sending complete - Success: ${successCount}, Failed: ${failureCount}`);

    return res.json({
      message: "Mass email operation completed",
      totalRecipients: allUsers.length,
      successCount,
      failureCount
    });
  } catch (error) {
    console.error("Error sending mass email:", error);
    return res.status(500).json({ error: "Failed to send mass email" });
  }
});

// Get all products
router.get("/products", authenticateToken, async (req, res) => {
  try {
    const allProducts = await db
      .select()
      .from(products)
      .orderBy(products.createdAt);

    return res.json(allProducts);
  } catch (error) {
    console.error("Error fetching products:", error);
    return res.status(500).json({ error: "Failed to fetch products" });
  }
});


// Update product
router.patch("/products/:productId", authenticateToken, checkSuperAdminAccess, async (req, res) => {
  try {
    const [product] = await db
      .update(products)
      .set(req.body)
      .where(eq(products.id, parseInt(req.params.productId)))
      .returning();

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    return res.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    return res.status(500).json({ error: "Failed to update product" });
  }
});

// Delete product
router.delete("/products/:productId", authenticateToken, checkSuperAdminAccess, async (req, res) => {
  try {
    const [product] = await db
      .delete(products)
      .where(eq(products.id, parseInt(req.params.productId)))
      .returning();

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    return res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return res.status(500).json({ error: "Failed to delete product" });
  }
});

// Get messages between admin and user
router.get("/messages/:userId", authenticateToken, checkSuperAdminAccess, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const adminId = req.user!.id;

    const chatMessages = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.sender_id, adminId),
          eq(messages.receiver_id, userId)
        )
      )
      .orderBy(desc(messages.created_at));

    return res.json(chatMessages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Send message to user
router.post("/messages/:userId", authenticateToken, checkSuperAdminAccess, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const adminId = req.user!.id;
    const { content, leadId } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Message content is required" });
    }

    // Create new message
    const [message] = await db
      .insert(messages)
      .values({
        sender_id: adminId,
        receiver_id: userId,
        lead_id: leadId, // This is required by our schema
        content,
        read: false,
      })
      .returning();

    return res.json(message);
  } catch (error) {
    console.error("Error sending message:", error);
    return res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;