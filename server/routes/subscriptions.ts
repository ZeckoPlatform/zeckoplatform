import { Router } from "express";
import Stripe from "stripe";
import { users, subscriptions } from "@db/schema";
import { db } from "@db";
import { eq, desc, and } from "drizzle-orm";
import { authenticateToken } from "../auth";
import express from "express";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is required");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = Router();

// Price configurations for different tiers and frequencies (in pence, excluding VAT)
const SUBSCRIPTION_PRICES = {
  business: {
    monthly: 2999, // £29.99 ex VAT
    annual: 32389, // £323.89 ex VAT (29.99 * 12 * 0.9)
  },
  vendor: {
    monthly: 4999, // £49.99 ex VAT
    annual: 53989, // £539.89 ex VAT (49.99 * 12 * 0.9)
  },
} as const;

// Calculate price with VAT for display
function calculatePriceWithVAT(baseAmount: number) {
  const vatRate = 0.20; // 20% VAT rate for UK
  const vatAmount = Math.round(baseAmount * vatRate);
  return {
    baseAmount,
    vatAmount,
    totalAmount: baseAmount + vatAmount
  };
}

// Webhook endpoint to handle Stripe events
router.post('/subscriptions/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('Missing STRIPE_WEBHOOK_SECRET');
    return res.status(500).send('Webhook Error: Missing webhook secret');
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig!, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'customer.subscription.deleted':
      const subscription = event.data.object as Stripe.Subscription;
      try {
        // Update subscription status in database
        await db.transaction(async (tx) => {
          // Find the user by Stripe customer ID
          const [user] = await tx
            .select()
            .from(users)
            .where(eq(users.stripeCustomerId, subscription.customer as string))
            .limit(1);

          if (!user) {
            throw new Error('User not found');
          }

          // Update subscription status
          await tx
            .update(subscriptions)
            .set({
              status: 'cancelled',
              end_date: new Date(subscription.current_period_end * 1000),
              auto_renew: false
            })
            .where(eq(subscriptions.user_id, user.id));

          // Update user subscription status
          await tx
            .update(users)
            .set({
              subscriptionActive: false,
              subscriptionTier: null
            })
            .where(eq(users.id, user.id));
        });
      } catch (error) {
        console.error('Error processing subscription cancellation:', error);
        return res.status(500).json({ error: 'Failed to process subscription cancellation' });
      }
      break;

    case 'customer.subscription.updated':
      const updatedSubscription = event.data.object as Stripe.Subscription;
      try {
        // Find user by Stripe customer ID
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.stripeCustomerId, updatedSubscription.customer as string))
          .limit(1);

        if (!user) {
          throw new Error('User not found');
        }

        // Update subscription status based on the Stripe status
        await db
          .update(subscriptions)
          .set({
            status: updatedSubscription.status === 'active' ? 'active' : 'paused',
            end_date: new Date(updatedSubscription.current_period_end * 1000),
          })
          .where(eq(subscriptions.user_id, user.id));

      } catch (error) {
        console.error('Error processing subscription update:', error);
        return res.status(500).json({ error: 'Failed to process subscription update' });
      }
      break;
  }

  res.json({ received: true });
});

// Get current subscription status
router.get("/subscriptions/current", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.log('Checking subscription status for user:', req.user.id);

    // Get user data with explicit column selection
    const [user] = await db
      .select({
        id: users.id,
        subscriptionActive: users.subscriptionActive,
        subscriptionTier: users.subscriptionTier,
        userType: users.userType,
        subscriptionEndsAt: users.subscriptionEndsAt
      })
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get current active subscription with explicit column selection
    const [currentSubscription] = await db
      .select({
        id: subscriptions.id,
        status: subscriptions.status,
        auto_renew: subscriptions.auto_renew,
        start_date: subscriptions.start_date,
        end_date: subscriptions.end_date
      })
      .from(subscriptions)
      .where(and(
        eq(subscriptions.user_id, req.user.id),
        eq(subscriptions.status, "active")
      ))
      .orderBy(desc(subscriptions.start_date))
      .limit(1);

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

// Cancel subscription
router.post("/subscriptions/:id/cancel", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const subscriptionId = parseInt(req.params.id);

    // Get subscription details
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(and(
        eq(subscriptions.id, subscriptionId),
        eq(subscriptions.user_id, req.user.id)
      ))
      .limit(1);

    if (!subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    // If it's a Stripe subscription, cancel it in Stripe
    if (subscription.stripeSubscriptionId) {
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId, {
        prorate: true // This ensures the user isn't charged for unused time
      });
    }

    // Update local subscription status
    await db.transaction(async (tx) => {
      await tx
        .update(subscriptions)
        .set({
          status: 'cancelled',
          auto_renew: false,
          end_date: new Date() // Set end date to now for immediate cancellation
        })
        .where(eq(subscriptions.id, subscriptionId));

      await tx
        .update(users)
        .set({
          subscriptionActive: false,
          subscriptionTier: null
        })
        .where(eq(users.id, req.user.id));
    });

    return res.json({ message: "Subscription cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return res.status(500).json({ error: "Failed to cancel subscription" });
  }
});

// Create checkout session
router.post("/subscriptions/create-checkout", authenticateToken, async (req, res) => {
  try {
    const { frequency } = req.body;
    const userType = req.user?.userType;

    if (!userType || !['business', 'vendor'].includes(userType)) {
      return res.status(400).json({ error: "Invalid user type" });
    }

    if (!frequency || !['monthly', 'annual'].includes(frequency)) {
      return res.status(400).json({ error: "Invalid frequency" });
    }

    const basePrice = SUBSCRIPTION_PRICES[userType][frequency];
    const { totalAmount } = calculatePriceWithVAT(basePrice);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `${userType.charAt(0).toUpperCase() + userType.slice(1)} ${frequency} Subscription`,
              description: `${frequency.charAt(0).toUpperCase() + frequency.slice(1)} subscription for ${userType}s (+ VAT)`,
            },
            unit_amount: basePrice,
            tax_behavior: 'exclusive', // This tells Stripe to handle VAT separately
          },
          quantity: 1,
        },
      ],
      automatic_tax: {
        enabled: true,
      },
      customer_email: req.user?.email,
      success_url: `${process.env.HOST_URL}/subscription?success=true`,
      cancel_url: `${process.env.HOST_URL}/subscription?cancelled=true`,
    });

    return res.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

export default router;