import { apiRequest } from "./queryClient";
import type { SubscriptionWithPayment } from "@db/schema";

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
  const response = await apiRequest("POST", "/api/subscriptions/trial", params);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to start trial subscription");
  }

  return response.json();
}

export async function cancelSubscription(subscriptionId: number): Promise<void> {
  const response = await apiRequest("POST", `/api/subscriptions/${subscriptionId}/cancel`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to cancel subscription");
  }
}

export async function updatePaymentMethod(
  subscriptionId: number,
  method: "stripe" | "direct_debit",
  details: any
): Promise<SubscriptionWithPayment> {
  const response = await apiRequest(
    "PATCH",
    `/api/subscriptions/${subscriptionId}/payment-method`,
    { method, details }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update payment method");
  }

  return response.json();
}
