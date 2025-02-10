import { Router } from "express";
import Stripe from "stripe";
import { users, subscriptions } from "@db/schema";
import { db } from "@db";
import { eq, desc, and } from "drizzle-orm";
import { authenticateToken } from "../auth";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is required");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = Router();

// Price configurations for different tiers and frequencies
const SUBSCRIPTION_PRICES = {
  business: {
    monthly: 2999, // in cents
    annual: 32389, // in cents (29.99 * 12 * 0.9)
  },
  vendor: {
    monthly: 4999, // in cents
    annual: 53989, // in cents (49.99 * 12 * 0.9)
  },
} as const;

router.get("/subscriptions/current", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.log('Checking subscription status for user:', req.user.id);

    // Get user data
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log('User subscription data:', {
      subscriptionActive: user.subscriptionActive,
      subscriptionTier: user.subscriptionTier,
      userType: user.userType
    });

    // Get current active subscription
    const [currentSubscription] = await db
      .select()
      .from(subscriptions)
      .where(and(
        eq(subscriptions.user_id, req.user.id),
        eq(subscriptions.status, "active")
      ))
      .orderBy(desc(subscriptions.start_date))
      .limit(1);

    console.log('Current subscription:', currentSubscription);

    // For admin-granted subscriptions or active user status
    const isActive = Boolean(user.subscriptionActive || 
                  (currentSubscription?.status === "active" && !currentSubscription?.auto_renew));

    // If user has an admin-granted subscription, ensure we show correct status
    const tier = user.subscriptionTier !== "none" ? user.subscriptionTier : "none";

    return res.json({
      active: isActive,
      tier: tier,
      endsAt: user.subscriptionEndsAt || currentSubscription?.end_date,
      userType: user.userType,
      isAdminGranted: currentSubscription ? !currentSubscription.auto_renew : false
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return res.status(500).json({ error: "Failed to fetch subscription details" });
  }
});

export default router;