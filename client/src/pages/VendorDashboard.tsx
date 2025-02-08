import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export default function VendorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const { data: accountStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["/api/vendor/stripe/account/status"],
    enabled: user?.stripeAccountId !== undefined,
  });

  const setupAccountMutation = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      const response = await apiRequest("POST", "/api/vendor/stripe/account", {
        email: user?.username, // Using username as email for demo
      });
      if (!response.ok) {
        throw new Error("Failed to create Stripe account");
      }
      const data = await response.json();
      window.location.href = data.onboardingUrl;
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    },
  });

  const getStatusBadge = () => {
    if (statusLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (!accountStatus) return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    return accountStatus.status === "enabled" ? (
      <CheckCircle2 className="h-4 w-4 text-green-500" />
    ) : (
      <AlertCircle className="h-4 w-4 text-yellow-500" />
    );
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Vendor Dashboard</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Payment Account Status {getStatusBadge()}
          </CardTitle>
          <CardDescription>
            Set up your Stripe account to receive payments from customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!user?.stripeAccountId ? (
            <div>
              <p className="mb-4">
                You haven't set up your payment account yet. Set up Stripe to start
                receiving payments for your products.
              </p>
              <Button
                onClick={() => setupAccountMutation.mutate()}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  "Set up Stripe Account"
                )}
              </Button>
            </div>
          ) : accountStatus?.status === "enabled" ? (
            <div className="space-y-2">
              <p className="text-green-600 font-medium">
                Your Stripe account is fully set up and ready to receive payments!
              </p>
              <dl className="space-y-1">
                <div className="flex gap-2">
                  <dt className="font-medium">Charges Enabled:</dt>
                  <dd>{accountStatus.details.chargesEnabled ? "Yes" : "No"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium">Payouts Enabled:</dt>
                  <dd>{accountStatus.details.payoutsEnabled ? "Yes" : "No"}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <div>
              <p className="text-yellow-600 mb-4">
                Your Stripe account setup is pending. Please complete the
                onboarding process to start receiving payments.
              </p>
              <Button
                onClick={() => setupAccountMutation.mutate()}
                disabled={isLoading}
              >
                Complete Stripe Setup
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
