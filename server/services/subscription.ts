import { addDays, addMonths, addYears } from "date-fns";
import { db } from "@db";
import { subscriptions, users } from "@db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { stripe } from "../stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

interface CreateSubscriptionParams {
  userId: number;
  tier: "business" | "vendor";
  paymentMethod: "stripe" | "direct_debit";
  paymentFrequency: "monthly" | "annual";
  stripePaymentMethodId?: string;
  bankDetails?: {
    accountHolder: string;
    sortCode: string;
    accountNumber: string;
  };
}

export async function startTrialSubscription({
  userId,
  tier,
  paymentMethod,
  paymentFrequency,
  stripePaymentMethodId,
  bankDetails,
}: CreateSubscriptionParams) {
  const trialEndDate = addDays(new Date(), 30);
  const subscriptionEndDate = paymentFrequency === "annual" 
    ? addYears(trialEndDate, 1)
    : addMonths(trialEndDate, 1);

  // Calculate price (example values, adjust as needed)
  const basePrice = tier === "business" ? 49900 : 99900; // £499 or £999
  const finalPrice = paymentFrequency === "annual"
    ? Math.floor(basePrice * 12 * 0.9) // 10% discount for annual
    : basePrice;

  if (paymentMethod === "stripe" && stripePaymentMethodId) {
    // Create Stripe subscription with trial
    const customer = await stripe.customers.create({
      payment_method: stripePaymentMethodId,
      invoice_settings: {
        default_payment_method: stripePaymentMethodId,
      },
    });

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: tier === "business" ? "price_business" : "price_vendor" }],
      trial_end: Math.floor(trialEndDate.getTime() / 1000),
      payment_settings: {
        payment_method_types: ["card"],
        save_default_payment_method: "on_subscription",
      },
    });

    // Create local subscription record
    return await db.insert(subscriptions).values({
      user_id: userId,
      tier,
      status: "trial",
      payment_frequency: paymentFrequency,
      payment_method: "stripe",
      start_date: new Date(),
      trial_end_date: trialEndDate,
      end_date: subscriptionEndDate,
      price: finalPrice,
      stripe_subscription_id: subscription.id,
      stripe_payment_method_id: stripePaymentMethodId,
    });
  } else if (paymentMethod === "direct_debit" && bankDetails) {
    // Create local subscription record for direct debit
    return await db.insert(subscriptions).values({
      user_id: userId,
      tier,
      status: "trial",
      payment_frequency: paymentFrequency,
      payment_method: "direct_debit",
      start_date: new Date(),
      trial_end_date: trialEndDate,
      end_date: subscriptionEndDate,
      price: finalPrice,
      bank_account_holder: bankDetails.accountHolder,
      bank_sort_code: bankDetails.sortCode,
      bank_account_number: bankDetails.accountNumber,
      mandate_status: "pending",
    });
  }

  throw new Error("Invalid payment method configuration");
}

export async function handleTrialEnd(subscriptionId: number) {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId));

  if (!subscription || subscription.status !== "trial") {
    return;
  }

  if (subscription.payment_method === "stripe" && subscription.stripe_subscription_id) {
    // Stripe handles the trial end automatically
    await db
      .update(subscriptions)
      .set({ status: "active" })
      .where(eq(subscriptions.id, subscriptionId));
  } else if (subscription.payment_method === "direct_debit") {
    // Initiate direct debit payment
    // This would integrate with your direct debit provider
    // For now, we'll just update the status
    await db
      .update(subscriptions)
      .set({ status: "active" })
      .where(eq(subscriptions.id, subscriptionId));
  }
}

export async function cancelSubscription(subscriptionId: number) {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId));

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  if (subscription.payment_method === "stripe" && subscription.stripe_subscription_id) {
    await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
  }

  // Update local subscription status
  await db
    .update(subscriptions)
    .set({ 
      status: "cancelled",
      auto_renew: false 
    })
    .where(eq(subscriptions.id, subscriptionId));
}
