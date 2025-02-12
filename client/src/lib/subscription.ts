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

export async function createCheckoutSession(
  tier: "business" | "vendor",
  paymentFrequency: "monthly" | "annual"
): Promise<{ checkoutUrl: string }> {
  try {
    console.log("Creating checkout session with params:", { tier, paymentFrequency });

    const response = await apiRequest("POST", "/api/subscriptions/checkout", {
      tier,
      paymentFrequency,
      successUrl: `${window.location.origin}/dashboard?subscription=success`,
      cancelUrl: `${window.location.origin}/subscription?canceled=true`,
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Failed to create checkout session:", error);
      throw new Error(error.message || "Failed to create checkout session");
    }

    const data = await response.json();
    console.log("Received checkout session response:", data);

    if (!data.checkoutUrl) {
      throw new Error("No checkout URL received from server");
    }

    return data;
  } catch (error) {
    console.error("Error in createCheckoutSession:", error);
    throw error;
  }
}

export async function getSubscriptionStatus(): Promise<{
  active: boolean;
  tier: string | null;
  endsAt: string | null;
  isAdminGranted?: boolean;
}> {
  try {
    const response = await apiRequest("GET", "/api/subscriptions/current");
    if (!response.ok) {
      throw new Error("Failed to fetch subscription status");
    }

    const data = await response.json();
    console.log("Subscription status response:", data);

    return {
      active: data.active || data.isAdminGranted,
      tier: data.tier,
      endsAt: data.endsAt,
      isAdminGranted: data.isAdminGranted
    };
  } catch (error) {
    console.error("Error fetching subscription status:", error);
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

    // Return the success message from the server
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    throw error;
  }
}

export async function pauseSubscription(
  subscriptionId: number,
  reason: string,
  resumeDate?: Date
): Promise<void> {
  try {
    const response = await apiRequest(
      "POST",
      `/api/subscriptions/${subscriptionId}/pause`,
      { reason, resumeDate }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to pause subscription");
    }
  } catch (error) {
    throw error;
  }
}

export async function resumeSubscription(subscriptionId: number): Promise<void> {
  try {
    const response = await apiRequest(
      "POST",
      `/api/subscriptions/${subscriptionId}/resume`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to resume subscription");
    }
  } catch (error) {
    throw error;
  }
}