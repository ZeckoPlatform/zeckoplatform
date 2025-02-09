import { Router } from "express";
import { authenticateToken } from "../auth";
import { db } from "@db";
import { users, documents, subscriptions, products, leads } from "@db/schema";
import { eq, and, count, sum } from "drizzle-orm";
import { z } from "zod";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import sgMail from "@sendgrid/mail";

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY must be set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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

    // Get active subscriptions count
    const [subStats] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"));

    // Calculate total revenue from active subscriptions
    const [revenue] = await db
      .select({ total: sum(subscriptions.price) })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"));

    res.json({
      totalUsers: userStats.count || 0,
      totalDocuments: docStats.count || 0,
      activeSubscriptions: subStats.count || 0,
      totalRevenue: Math.floor((revenue?.total || 0) / 100), // Convert from pence to pounds
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

// Update user subscription (super admin only)
router.post("/admin/users/:userId/subscription", authenticateToken, checkSuperAdminAccess, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { subscriptionType } = req.body;

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

    // Cancel any existing subscription
    await db
      .update(subscriptions)
      .set({ status: "cancelled" })
      .where(eq(subscriptions.userId, userId));

    if (subscriptionType !== "free") {
      // Create new subscription
      await db
        .insert(subscriptions)
        .values({
          userId,
          status: "active",
          type: subscriptionType,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        });
    }

    // Update user type
    const [updatedUser] = await db
      .update(users)
      .set({ userType: subscriptionType })
      .where(eq(users.id, userId))
      .returning();

    return res.json(updatedUser);
  } catch (error) {
    console.error("Error updating subscription:", error);
    return res.status(500).json({ error: "Failed to update subscription" });
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

// Send mass email to all users
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

    const emailPromises = allUsers.map(user => {
      return sgMail.send({
        to: user.email,
        from: "noreply@zecko.com", // Replace with your verified sender
        subject: subject,
        text: message,
        html: message.replace(/\n/g, '<br>'),
        personalizations: [{
          to: [{ email: user.email }],
          dynamicTemplateData: {
            username: user.username
          }
        }]
      });
    });

    await Promise.all(emailPromises);

    return res.json({
      message: "Mass email sent successfully",
      recipientCount: allUsers.length
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

// Create new product
router.post("/products", authenticateToken, checkSuperAdminAccess, async (req, res) => {
  try {
    const [product] = await db
      .insert(products)
      .values({
        ...req.body,
        vendorId: req.user.id,
      })
      .returning();

    return res.status(201).json(product);
  } catch (error) {
    console.error("Error creating product:", error);
    return res.status(500).json({ error: "Failed to create product" });
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

export default router;