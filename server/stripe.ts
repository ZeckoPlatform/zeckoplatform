import Stripe from 'stripe';
import { env } from 'process';
import { log } from './vite';

let stripe: Stripe | null = null;

export function getStripeClient() {
  if (!stripe && env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16', // Using latest stable version
    });
  }
  return stripe;
}

export async function createConnectedAccount(email: string) {
  const stripe = getStripeClient();
  if (!stripe) {
    throw new Error('Stripe client not initialized');
  }

  try {
    // Create a Connect account
    const account = await stripe.accounts.create({
      type: 'standard',
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${env.HOST_URL}/vendor/stripe/refresh`,
      return_url: `${env.HOST_URL}/vendor/stripe/return`,
      type: 'account_onboarding',
    });

    return {
      accountId: account.id,
      onboardingUrl: accountLink.url,
    };
  } catch (error) {
    log(`Stripe Connect account creation error: ${error}`);
    throw error;
  }
}

export async function retrieveConnectedAccount(accountId: string) {
  const stripe = getStripeClient();
  if (!stripe) {
    throw new Error('Stripe client not initialized');
  }

  try {
    const account = await stripe.accounts.retrieve(accountId);
    return account;
  } catch (error) {
    log(`Stripe Connect account retrieval error: ${error}`);
    throw error;
  }
}

export async function createPaymentIntent(amount: number, vendorStripeAccountId: string) {
  const stripe = getStripeClient();
  if (!stripe) {
    throw new Error('Stripe client not initialized');
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'gbp',
      application_fee_amount: Math.round(amount * 0.05), // 5% platform fee
      transfer_data: {
        destination: vendorStripeAccountId,
      },
    });

    return paymentIntent;
  } catch (error) {
    log(`Payment intent creation error: ${error}`);
    throw error;
  }
}
