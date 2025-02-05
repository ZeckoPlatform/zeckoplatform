import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, CreditCard, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

type SubscriptionResponse = {
  status: {
    isActive: boolean;
    tier: string;
    endsAt: string | null;
  };
  subscription: {
    id: number;
    tier: "business" | "vendor";
    status: "active" | "cancelled" | "expired";
    start_date: string;
    end_date: string;
    auto_renew: boolean;
    price: number;
  } | null;
};

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: subscriptionData } = useQuery<SubscriptionResponse>({
    queryKey: ["/api/subscriptions/current"],
    enabled: user?.userType !== "free",
  });

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscriptions");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Subscription activated",
        description: "Your subscription has been successfully activated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Subscription failed",
        description: error.message,
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Subscription Management</h1>

      {isSubscriptionActive && currentSubscription ? (
        <Card>
          <CardHeader>
            <CardTitle>Active Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">
                  {currentSubscription.tier.charAt(0).toUpperCase() + 
                   currentSubscription.tier.slice(1)} Plan
                </p>
                <p className="text-sm text-muted-foreground">
                  ${(currentSubscription.price / 100).toFixed(2)}/month
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Subscription Period</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(currentSubscription.start_date), "PPP")} -{" "}
                  {format(new Date(currentSubscription.end_date), "PPP")}
                </p>
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
            <CardTitle>Subscribe Now</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <AlertTriangle className="h-6 w-6 text-primary" />
              <div>
                <p className="font-medium">No Active Subscription</p>
                <p className="text-sm text-muted-foreground">
                  {user?.userType === "business"
                    ? "Subscribe to start responding to leads"
                    : "Subscribe to start selling products"}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 border rounded-lg">
                <div>
                  <p className="font-medium">
                    {user?.userType === "business" ? "Business Plan" : "Vendor Plan"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {user?.userType === "business"
                      ? "Access to all leads and direct communication"
                      : "List and sell products in the marketplace"}
                  </p>
                </div>
                <p className="text-xl font-bold">
                  ${user?.userType === "business" ? "29.99" : "49.99"}/mo
                </p>
              </div>

              <Button
                className="w-full"
                onClick={() => subscribeMutation.mutate()}
                disabled={subscribeMutation.isPending}
              >
                Subscribe Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}