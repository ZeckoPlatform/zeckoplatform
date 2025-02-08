import { apiRequest } from "./queryClient";
import type { SubscriptionWithPayment } from "@db/schema";
import { useToast } from "@/hooks/use-toast";

interface StartTrialParams {
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

export async function startTrialSubscription(params: StartTrialParams): Promise<SubscriptionWithPayment> {
  try {
    const response = await apiRequest("POST", "/api/subscriptions/trial", params);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to start trial subscription");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}

export async function getSubscriptionStatus(): Promise<{
  active: boolean;
  tier: string | null;
  endsAt: string | null;
}> {
  try {
    const response = await apiRequest("GET", "/api/subscriptions/current");
    if (!response.ok) {
      throw new Error("Failed to fetch subscription status");
    }
    return response.json();
  } catch (error) {
    throw error;
  }
}

export async function createCheckoutSession(tier: "business" | "vendor", paymentFrequency: "monthly" | "annual"): Promise<{ checkoutUrl: string }> {
  try {
    const response = await apiRequest("POST", "/api/subscriptions", {
      tier,
      paymentFrequency,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create checkout session");
    }

    return response.json();
  } catch (error) {
    throw error;
  }
}

export async function cancelSubscription(subscriptionId: number): Promise<void> {
  try {
    const response = await apiRequest("POST", `/api/subscriptions/${subscriptionId}/cancel`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to cancel subscription");
    }
  } catch (error) {
    throw error;
  }
}

export async function updatePaymentMethod(
  subscriptionId: number,
  method: "stripe" | "direct_debit",
  details: any
): Promise<SubscriptionWithPayment> {
  try {
    const response = await apiRequest(
      "PATCH",
      `/api/subscriptions/${subscriptionId}/payment-method`,
      { method, details }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update payment method");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}