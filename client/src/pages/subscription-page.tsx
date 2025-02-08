import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const subscriptionFormSchema = z.object({
  paymentFrequency: z.enum(["monthly", "annual"]),
});

type SubscriptionFormData = z.infer<typeof subscriptionFormSchema>;

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: {
      paymentFrequency: "monthly",
    },
  });

  const { data: subscriptionData } = useQuery({
    queryKey: ["/api/subscriptions/current"],
    enabled: !!user && user.userType !== "free",
  });

  const subscribeMutation = useMutation({
    mutationFn: async (data: SubscriptionFormData) => {
      setIsLoading(true);
      try {
        const res = await apiRequest("POST", "/api/subscriptions", {
          tier: user?.userType,
          paymentFrequency: data.paymentFrequency,
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to start subscription");
        }

        const responseData = await res.json();
        if (responseData.checkoutUrl) {
          window.location.href = responseData.checkoutUrl;
          return;
        }
        throw new Error("No checkout URL received");
      } finally {
        setIsLoading(false);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start subscription",
        variant: "destructive",
      });
    },
  });

  const basePrice = user?.userType === "business" ? 29.99 : 49.99;
  const monthlyPrice = basePrice;
  const annualPrice = (basePrice * 12 * 0.9).toFixed(2); // 10% discount

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Start Your 30-Day Free Trial</CardTitle>
          <CardDescription>
            Try our full {user.userType} plan free for 30 days. You'll be redirected to our secure payment provider to set up your payment details.
            Your first payment will be processed after the trial period ends.
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
                  'Start Free Trial'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}