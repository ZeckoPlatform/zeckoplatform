import { Router } from "express";
import Stripe from "stripe";
import { users } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
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

router.post("/subscriptions/checkout", authenticateToken, async (req, res) => {
  try {
    console.log("Creating checkout session with body:", req.body);

    const { tier, paymentFrequency } = req.body as {
      tier: keyof typeof SUBSCRIPTION_PRICES;
      paymentFrequency: "monthly" | "annual";
    };

    if (!tier || !paymentFrequency) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const amount = SUBSCRIPTION_PRICES[tier][paymentFrequency];
    const interval = paymentFrequency === 'annual' ? 'year' : 'month';

    console.log(`Creating checkout session for ${tier} subscription with ${interval}ly billing`);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'gbp',
          product_data: {
            name: `${tier.charAt(0).toUpperCase() + tier.slice(1)} Subscription`,
          },
          unit_amount: amount,
          recurring: {
            interval: interval,
          },
        },
        quantity: 1,
      }],
      success_url: `${req.protocol}://${req.get("host")}/dashboard?subscription=success`,
      cancel_url: `${req.protocol}://${req.get("host")}/subscription?canceled=true`,
      customer_email: req.user?.email,
      subscription_data: {
        trial_period_days: 30,
        metadata: {
          userId: req.user?.id.toString(),
          tier,
        },
      },
    });

    console.log("Checkout session created:", {
      sessionId: session.id,
      url: session.url
    });

    // Update user's subscription status to pending
    await db
      .update(users)
      .set({
        subscriptionTier: tier,
      })
      .where(eq(users.id, req.user!.id));

    return res.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error("Stripe session creation error:", error);
    return res.status(500).json({
      error: "Failed to create checkout session",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

router.get("/subscriptions/current", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const [subscription] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    return res.json({
      active: subscription.subscriptionActive,
      tier: subscription.subscriptionTier,
      endsAt: subscription.subscriptionEndsAt,
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return res.status(500).json({ error: "Failed to fetch subscription details" });
  }
});

export default router;