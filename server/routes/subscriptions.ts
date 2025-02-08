import { Router } from "express";
import Stripe from "stripe";
import { users } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is required");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

const router = Router();

const SUBSCRIPTION_PRICES = {
  business: {
    monthly: 2999, // in cents
    annual: 32389, // in cents (29.99 * 12 * 0.9)
  },
  vendor: {
    monthly: 4999, // in cents
    annual: 53989, // in cents (49.99 * 12 * 0.9)
  },
};

router.post("/subscriptions", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { tier, paymentFrequency } = req.body;

  if (!SUBSCRIPTION_PRICES[tier]) {
    return res.status(400).json({ error: "Invalid subscription tier" });
  }

  try {
    const price = SUBSCRIPTION_PRICES[tier][paymentFrequency];
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: req.user.username,
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `${tier.charAt(0).toUpperCase() + tier.slice(1)} ${paymentFrequency} Plan`,
              description: `${tier.charAt(0).toUpperCase() + tier.slice(1)} subscription with ${paymentFrequency} billing`,
            },
            unit_amount: price,
            recurring: {
              interval: paymentFrequency === "annual" ? "year" : "month",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${req.protocol}://${req.get("host")}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get("host")}/subscription`,
      subscription_data: {
        trial_period_days: 30,
        metadata: {
          userId: req.user.id,
          tier,
          paymentFrequency,
        },
      },
    });

    // Update user's subscription status
    await db
      .update(users)
      .set({
        subscriptionActive: true,
        subscriptionTier: tier,
      })
      .where(eq(users.id, req.user.id));

    return res.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error("Stripe session creation error:", error);
    return res.status(500).json({ error: "Failed to create checkout session" });
  }
});

export default router;
