import Stripe from 'stripe';
import { env } from 'process';
import { log } from './vite';

let stripe: Stripe | null = null;

export function getStripeClient() {
  if (!stripe && env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-01-27.acacia',
    });
  }
  return stripe;
}

// Helper function to calculate price with VAT
export function calculatePriceWithVAT(baseAmount: number) {
  const vatRate = 0.20; // 20% VAT for UK
  const vatAmount = Math.round(baseAmount * vatRate);
  return {
    baseAmount,
    vatAmount,
    totalAmount: baseAmount + vatAmount
  };
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
      settings: {
        tax_reporting: {
          enabled: true // Enable tax reporting for VAT
        }
      }
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

export async function createPaymentIntent(baseAmount: number, vendorStripeAccountId: string) {
  const stripe = getStripeClient();
  if (!stripe) {
    throw new Error('Stripe client not initialized');
  }

  try {
    // Calculate amount including VAT
    const { totalAmount } = calculatePriceWithVAT(baseAmount);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: 'gbp',
      application_fee_amount: Math.round(baseAmount * 0.05), // 5% platform fee on base amount
      transfer_data: {
        destination: vendorStripeAccountId,
      },
      metadata: {
        baseAmount: baseAmount,
        vatAmount: totalAmount - baseAmount,
      },
      tax_rates: ['txr_1234'], // Replace with your actual VAT tax rate ID from Stripe
    });

    return paymentIntent;
  } catch (error) {
    log(`Payment intent creation error: ${error}`);
    throw error;
  }
}