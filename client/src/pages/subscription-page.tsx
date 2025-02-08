import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
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
  bankAccountHolder: z.string().optional(),
  bankSortCode: z.string().optional(),
  bankAccountNumber: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.paymentMethod === "direct_debit") {
    if (!data.bankAccountHolder || data.bankAccountHolder.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Account holder name is required for direct debit",
        path: ["bankAccountHolder"],
      });
    }
    if (!data.bankSortCode || !/^\d{6}$/.test(data.bankSortCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Valid sort code is required for direct debit",
        path: ["bankSortCode"],
      });
    }
    if (!data.bankAccountNumber || !/^\d{8}$/.test(data.bankAccountNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Valid account number is required for direct debit",
        path: ["bankAccountNumber"],
      });
    }
  }
});

type SubscriptionFormData = z.infer<typeof subscriptionFormSchema>;

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

  const { data: subscriptionData } = useQuery({
    queryKey: ["/api/subscriptions/current"],
    enabled: !!user && user.userType !== "free",
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
        description: "Your 30-day free trial has started. Your first payment will be processed after the trial period.",
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
            Try our full {user.userType} plan free for 30 days. Set up your payment method now,
            and your first payment will be processed after the trial period ends.
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
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Reset bank details when switching to Stripe
                          if (value === "stripe") {
                            form.resetField("bankAccountHolder");
                            form.resetField("bankSortCode");
                            form.resetField("bankAccountNumber");
                          }
                        }}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="stripe" id="stripe" />
                          <Label htmlFor="stripe">Credit/Debit Card (Secure payment via Stripe)</Label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="direct_debit" id="direct_debit" />
                          <Label htmlFor="direct_debit">Direct Debit</Label>
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
                          <Input {...field} placeholder="John Smith" required />
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
                          <Input {...field} placeholder="123456" maxLength={6} required />
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
                          <Input {...field} placeholder="12345678" maxLength={8} required />
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
    </div>
  );
}