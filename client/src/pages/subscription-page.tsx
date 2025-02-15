import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  createCheckoutSession,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  getSubscriptionStatus,
} from "@/lib/subscription";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Loader2, AlertTriangle } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const subscriptionFormSchema = z.object({
  paymentFrequency: z.enum(["monthly", "annual"])
});

type SubscriptionFormData = z.infer<typeof subscriptionFormSchema>;

// Add VAT calculation helper
const calculatePriceWithVAT = (basePrice: number) => {
  const vatRate = 0.20; // 20% VAT rate for UK
  const vat = basePrice * vatRate;
  return {
    basePrice,
    vat,
    total: basePrice + vat
  };
};

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState("");
  const [resumeDate, setResumeDate] = useState<Date>();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: {
      paymentFrequency: "monthly"
    }
  });

  // Get current subscription status
  const { data: subscriptionData, refetch: refetchSubscription } = useQuery({
    queryKey: ["/api/subscriptions/current"],
    queryFn: getSubscriptionStatus,
    enabled: !!user && user.userType !== "free",
  });

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      await cancelSubscription(subscriptionData?.id);
    },
    onSuccess: () => {
      refetchSubscription();
      toast({
        title: "Subscription cancelled",
        description: "Your subscription has been cancelled successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async () => {
      if (!subscriptionData?.id) throw new Error("No subscription ID found");
      await pauseSubscription(subscriptionData.id, pauseReason, resumeDate);
    },
    onSuccess: () => {
      setPauseDialogOpen(false);
      setPauseReason("");
      setResumeDate(undefined);
      refetchSubscription();
      toast({
        title: "Subscription paused",
        description: "Your subscription has been paused successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to pause subscription",
        variant: "destructive",
      });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async () => {
      if (!subscriptionData?.id) throw new Error("No subscription ID found");
      await resumeSubscription(subscriptionData.id);
    },
    onSuccess: () => {
      refetchSubscription();
      toast({
        title: "Subscription resumed",
        description: "Your subscription has been resumed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resume subscription",
        variant: "destructive",
      });
    },
  });

  const subscribeMutation = useMutation({
    mutationFn: async (data: SubscriptionFormData) => {
      setIsLoading(true);
      try {
        if (!user?.userType) throw new Error("User type not found");
        console.log("Starting subscription process...");

        const { checkoutUrl } = await createCheckoutSession(
          user.userType as "business" | "vendor",
          data.paymentFrequency
        );

        console.log("Received checkout URL:", checkoutUrl);

        if (!checkoutUrl) {
          throw new Error("No checkout URL received");
        }

        window.location.href = checkoutUrl;
      } catch (error) {
        console.error("Subscription error:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    onError: (error: Error) => {
      console.error("Subscription mutation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to start subscription",
        variant: "destructive",
      });
    },
  });

  const basePrice = user?.userType === 'business' ? 29.99 : 49.99;
  const monthlyPrice = calculatePriceWithVAT(basePrice);
  const annualBasePrice = (basePrice * 12 * 0.9); // 10% discount
  const annualPrice = calculatePriceWithVAT(annualBasePrice);

  if (!user || user.userType === "free") {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Not Available</CardTitle>
            <CardDescription>
              Subscription plans are only available for business and vendor accounts.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Check if subscription is active (either paid or admin-granted)
  const isSubscriptionActive = subscriptionData?.active || subscriptionData?.isAdminGranted;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Subscription Management</CardTitle>
          <CardDescription>
            Manage your {user.userType} subscription here
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Status</h3>
              <p className="text-sm text-muted-foreground">
                {isSubscriptionActive
                  ? subscriptionData?.isAdminGranted
                    ? "Active (Admin Granted)"
                    : "Active"
                  : "Inactive"}
              </p>
              {subscriptionData?.isAdminGranted ? (
                <p className="text-sm text-muted-foreground mt-1">
                  This subscription was granted by an administrator
                  {subscriptionData.endsAt && ` and is valid until ${format(new Date(subscriptionData.endsAt), "PP")}`}
                </p>
              ) : subscriptionData?.endsAt && (
                <p className="text-sm text-muted-foreground mt-1">
                  Next billing date: {format(new Date(subscriptionData.endsAt), "PP")}
                </p>
              )}
            </div>

            {/* Show subscription management buttons for active subscriptions */}
            {isSubscriptionActive && (
              <div className="space-x-2">
                {!subscriptionData?.isAdminGranted && (
                  <Button
                    variant="outline"
                    onClick={() => setPauseDialogOpen(true)}
                    disabled={pauseMutation.isPending}
                  >
                    {pauseMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Pause Subscription
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to cancel your subscription?' + 
                      (subscriptionData?.isAdminGranted 
                        ? ' This will immediately end your admin-granted subscription.'
                        : ' This will take effect at the end of your current billing period.'))) {
                      cancelSubscriptionMutation.mutate();
                    }
                  }}
                  disabled={cancelSubscriptionMutation.isPending}
                >
                  {cancelSubscriptionMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Cancel Subscription
                </Button>
              </div>
            )}
          </div>

          {/* Show subscription options only for inactive subscriptions */}
          {!isSubscriptionActive && (
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
                          value={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="monthly" id="monthly" />
                            <Label htmlFor="monthly">
                              Monthly (£{monthlyPrice.basePrice.toFixed(2)} + VAT = £{monthlyPrice.total.toFixed(2)}/month)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="annual" id="annual" />
                            <Label htmlFor="annual">
                              Annual (£{annualPrice.basePrice.toFixed(2)} + VAT = £{annualPrice.total.toFixed(2)}/year - Save 10%)
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />

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
                    'Subscribe Now'
                  )}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>

      <Dialog open={isPauseDialogOpen} onOpenChange={setPauseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause Subscription</DialogTitle>
            <DialogDescription>
              Your subscription will be paused, and you won't be charged during the
              pause period. You can resume your subscription at any time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for pausing (optional)</Label>
              <Input
                id="reason"
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                placeholder="Tell us why you're pausing"
              />
            </div>
            <div className="space-y-2">
              <Label>Resume Date (optional)</Label>
              <Calendar
                mode="single"
                selected={resumeDate}
                onSelect={setResumeDate}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
              />
            </div>
            <Button
              onClick={() => pauseMutation.mutate()}
              disabled={pauseMutation.isPending}
              className="w-full"
            >
              {pauseMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Confirm Pause
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}