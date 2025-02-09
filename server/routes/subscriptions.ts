import { Router } from "express";
import Stripe from "stripe";
import { users } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { authenticateToken } from "../auth";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is required");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16"
});

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

// Cache for Stripe product and price IDs
let stripePriceIds: Record<string, string> = {};

// Initialize Stripe products and prices
async function initializeStripePrices() {
  try {
    console.log("Initializing Stripe prices...");

    // Create or retrieve products for each tier
    for (const tier of ['business', 'vendor'] as const) {
      const productName = `${tier.charAt(0).toUpperCase() + tier.slice(1)} Subscription`;
      console.log(`Setting up product: ${productName}`);

      // Create or get product
      let product = (await stripe.products.list({ active: true })).data
        .find(p => p.name === productName);

      if (!product) {
        console.log(`Creating new product: ${productName}`);
        product = await stripe.products.create({
          name: productName,
          description: `${productName} with 30-day free trial`,
        });
      }

      // Create or get prices for each frequency
      for (const frequency of ['monthly', 'annual'] as const) {
        const priceKey = `${tier}_${frequency}`;
        const amount = SUBSCRIPTION_PRICES[tier][frequency];
        console.log(`Setting up price for ${priceKey} (${amount} pence)`);

        let price = (await stripe.prices.list({ 
          product: product.id,
          active: true,
        })).data.find(p => 
          p.unit_amount === amount && 
          p.recurring?.interval === (frequency === 'annual' ? 'year' : 'month')
        );

        if (!price) {
          console.log(`Creating new price for ${priceKey}`);
          price = await stripe.prices.create({
            product: product.id,
            unit_amount: amount,
            currency: 'gbp',
            recurring: {
              interval: frequency === 'annual' ? 'year' : 'month',
            },
          });
        }

        stripePriceIds[priceKey] = price.id;
        console.log(`Price ID for ${priceKey}: ${price.id}`);
      }
    }

    console.log("Stripe prices initialized successfully:", stripePriceIds);
  } catch (error) {
    console.error('Error initializing Stripe prices:', error);
    throw error;
  }
}

// Initialize prices when the server starts
initializeStripePrices().catch(console.error);

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

    const priceId = stripePriceIds[`${tier}_${paymentFrequency}`];
    if (!priceId) {
      console.error("Price ID not found for:", { tier, paymentFrequency });
      return res.status(500).json({ error: "Price configuration not found" });
    }

    console.log(`Creating checkout session with price ID: ${priceId}`);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      success_url: `${req.protocol}://${req.get("host")}/dashboard?subscription=success`,
      cancel_url: `${req.protocol}://${req.get("host")}/subscription?canceled=true`,
      customer_email: req.user?.email,
      subscription_data: {
        trial_period_days: 30,
      },
      metadata: {
        userId: req.user?.id.toString(),
        tier,
        paymentFrequency,
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

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    return res.json({
      active: user.subscriptionActive,
      tier: user.subscriptionTier,
      endsAt: user.subscriptionEndsAt,
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return res.status(500).json({ error: "Failed to fetch subscription details" });
  }
});

export default router;