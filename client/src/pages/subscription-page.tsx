import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, CreditCard, Loader2, Building2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const subscriptionFormSchema = z.object({
  paymentMethod: z.enum(["stripe", "direct_debit"]),
  paymentFrequency: z.enum(["monthly", "annual"]),
  // Direct debit fields
  bankAccountHolder: z.string().optional(),
  bankSortCode: z.string().optional(),
  bankAccountNumber: z.string().optional(),
});

type SubscriptionFormData = z.infer<typeof subscriptionFormSchema>;

type SubscriptionResponse = {
  status: {
    isActive: boolean;
    tier: string;
    endsAt: string | null;
  };
  subscription: {
    id: number;
    tier: "business" | "vendor";
    status: "trial" | "active" | "cancelled" | "expired";
    start_date: string;
    end_date: string;
    trial_end_date?: string;
    auto_renew: boolean;
    price: number;
    payment_method: "stripe" | "direct_debit";
    payment_frequency: "monthly" | "annual";
  } | null;
};

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: {
      paymentMethod: "stripe",
      paymentFrequency: "monthly",
    },
  });

  const { data: subscriptionData } = useQuery<SubscriptionResponse>({
    queryKey: ["/api/subscriptions/current"],
    enabled: user?.userType !== "free",
  });

  const subscribeMutation = useMutation({
    mutationFn: async (data: SubscriptionFormData) => {
      setIsLoading(true);
      try {
        if (data.paymentMethod === "stripe") {
          const res = await apiRequest("POST", "/api/subscriptions", {
            tier: user?.userType,
            paymentMethod: data.paymentMethod,
            paymentFrequency: data.paymentFrequency,
          });
          const responseData = await res.json();

          if (responseData.stripeUrl) {
            window.location.href = responseData.stripeUrl;
            return;
          }
          return responseData;
        } else {
          const res = await apiRequest("POST", "/api/subscriptions", {
            tier: user?.userType,
            paymentMethod: data.paymentMethod,
            paymentFrequency: data.paymentFrequency,
            bankDetails: {
              accountHolder: data.bankAccountHolder,
              sortCode: data.bankSortCode,
              accountNumber: data.bankAccountNumber,
            },
          });
          return res.json();
        }
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Success",
        description: "Your 30-day free trial has started.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start subscription",
        variant: "destructive",
      });
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscriptions/cancel");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/current"] });
      toast({
        title: "Subscription cancelled",
        description: "Your subscription has been cancelled.",
      });
    },
  });

  if (user?.userType === "free") {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Not Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Subscription plans are only available for business and vendor accounts.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSubscriptionActive = subscriptionData?.status.isActive;
  const currentSubscription = subscriptionData?.subscription;
  const isTrialPeriod = currentSubscription?.status === "trial";
  const trialEndDate = currentSubscription?.trial_end_date
    ? new Date(currentSubscription.trial_end_date)
    : addDays(new Date(), 30);

  const basePrice = user?.userType === "business" ? 29.99 : 49.99;
  const monthlyPrice = basePrice;
  const annualPrice = (basePrice * 12 * 0.9).toFixed(2); // 10% discount

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Subscription Management</h1>

      {isSubscriptionActive && currentSubscription ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {isTrialPeriod ? "Free Trial Active" : "Active Subscription"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-2">
              {currentSubscription.payment_method === "stripe" ? (
                <CreditCard className="h-5 w-5 text-primary" />
              ) : (
                <Building2 className="h-5 w-5 text-primary" />
              )}
              <div>
                <p className="font-medium">
                  {currentSubscription.tier.charAt(0).toUpperCase() +
                    currentSubscription.tier.slice(1)} Plan
                </p>
                <p className="text-sm text-muted-foreground">
                  £{(currentSubscription.price / 100).toFixed(2)}/
                  {currentSubscription.payment_frequency}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">
                  {isTrialPeriod ? "Trial Period" : "Subscription Period"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(currentSubscription.start_date), "PPP")} -{" "}
                  {format(new Date(currentSubscription.end_date), "PPP")}
                </p>
                {isTrialPeriod && (
                  <p className="text-sm text-primary mt-1">
                    Trial ends on {format(trialEndDate, "PPP")}
                  </p>
                )}
              </div>
            </div>

            {currentSubscription.status === "active" && (
              <div className="pt-4">
                <Button
                  variant="destructive"
                  onClick={() => cancelSubscriptionMutation.mutate()}
                  disabled={cancelSubscriptionMutation.isPending}
                >
                  Cancel Subscription
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Start Your 30-Day Free Trial</CardTitle>
            <CardDescription>
              Try our full {user?.userType} plan free for 30 days.
              You won't be charged during the trial period.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => subscribeMutation.mutate(data))}
                    className="space-y-6">
                <FormField
                  control={form.control}
                  name="paymentFrequency"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Billing Frequency</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="monthly" id="monthly" />
                            <Label htmlFor="monthly">
                              Monthly (£{monthlyPrice}/month)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="annual" id="annual" />
                            <Label htmlFor="annual">
                              Annual (£{annualPrice}/year - Save 10%)
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Payment Method</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="stripe" id="stripe" />
                            <Label htmlFor="stripe">
                              Credit/Debit Card
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="direct_debit" id="direct_debit" />
                            <Label htmlFor="direct_debit">
                              Direct Debit
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("paymentMethod") === "direct_debit" && (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="bankAccountHolder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Holder Name</FormLabel>
                          <FormControl>
                            <Input {...field} required />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bankSortCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sort Code</FormLabel>
                          <FormControl>
                            <Input {...field} required />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bankAccountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl>
                            <Input {...field} required />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || subscribeMutation.isPending}
                >
                  {isLoading || subscribeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up subscription...
                    </>
                  ) : (
                    'Start Free Trial'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}