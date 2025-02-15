import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, AlertCircle, CheckCircle2, Package, ShoppingBag, BarChart3, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";

// Components for each tab
import ProductManagement from "@/components/vendor/ProductManagement";
import OrderManagement from "@/components/vendor/OrderManagement";
import VendorAnalytics from "@/components/vendor/VendorAnalytics";
import VendorMessages from "@/components/vendor/VendorMessages";
import PaymentSetup from "@/components/vendor/PaymentSetup";

export default function VendorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("products");

  const { data: accountStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["/api/vendor/stripe/account/status"],
    enabled: user?.stripeAccountId !== undefined,
  });

  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/vendor/dashboard-stats"],
    enabled: user?.stripeAccountId !== undefined && accountStatus?.status === "enabled",
  });

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ["/api/vendor/balance"],
    enabled: user?.stripeAccountId !== undefined && accountStatus?.status === "enabled",
  });

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ["/api/vendor/transactions"],
    enabled: user?.stripeAccountId !== undefined && accountStatus?.status === "enabled",
  });

  const { data: payouts = [], isLoading: payoutsLoading } = useQuery({
    queryKey: ["/api/vendor/payouts"],
    enabled: user?.stripeAccountId !== undefined && accountStatus?.status === "enabled",
  });


  const setupAccountMutation = useMutation({
    mutationFn: async () => {
      //setIsLoading(true); //moved to PaymentSetup component
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
      //setIsLoading(false); //moved to PaymentSetup component
    },
  });

  const syncTransactionsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/vendor/transactions/sync");
      if (!response.ok) {
        throw new Error("Failed to sync transactions");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Transactions synced successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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

  if (statusLoading || statsLoading || balanceLoading || transactionsLoading || payoutsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Vendor Dashboard</h1>
        {!user?.stripeAccountId && (
          <PaymentSetup setupAccountMutation={setupAccountMutation} />
        )}
      </div>

      {/* Quick Stats */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Total Products</CardTitle>
              <div className="text-2xl font-bold">{dashboardStats.totalProducts}</div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Active Orders</CardTitle>
              <div className="text-2xl font-bold">{dashboardStats.activeOrders}</div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Today's Sales</CardTitle>
              <div className="text-2xl font-bold">£{dashboardStats.todaySales.toFixed(2)}</div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Unread Messages</CardTitle>
              <div className="text-2xl font-bold">{dashboardStats.unreadMessages}</div>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-8">
          <TabsTrigger value="products">
            <Package className="w-4 h-4 mr-2" />
            Products
          </TabsTrigger>
          <TabsTrigger value="orders">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageSquare className="w-4 h-4 mr-2" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="transactions">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="payouts">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Payouts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <ProductManagement />
        </TabsContent>

        <TabsContent value="orders">
          <OrderManagement />
        </TabsContent>

        <TabsContent value="analytics">
          <VendorAnalytics />
        </TabsContent>

        <TabsContent value="messages">
          <VendorMessages />
        </TabsContent>
        <TabsContent value="transactions">
          <div className="space-y-4">
            {transactions.map((transaction: any) => (
              <div
                key={transaction.id}
                className="flex justify-between items-center p-4 border rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    Transfer #{transaction.stripe_transfer_id}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(transaction.created_at), "PPP")}
                  </p>
                  <p className="text-sm">
                    Amount: £{(transaction.amount / 100).toFixed(2)}
                  </p>
                  <p className="text-sm capitalize">Status: {transaction.status}</p>
                </div>
                {transaction.product_details && (
                  <div className="text-sm text-muted-foreground">
                    <p>Product: {transaction.product_details.name}</p>
                    <p>Quantity: {transaction.product_details.quantity}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="payouts">
          <div className="space-y-4">
            {payouts.data.map((payout: any) => (
              <div
                key={payout.id}
                className="flex justify-between items-center p-4 border rounded-lg"
              >
                <div>
                  <p className="font-medium">Payout #{payout.id}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(payout.created * 1000), "PPP")}
                  </p>
                  <p className="text-sm">
                    Amount: £{(payout.amount / 100).toFixed(2)}
                  </p>
                  <p className="text-sm capitalize">
                    Status: {payout.status}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Method: {payout.type}</p>
                  {payout.bank_account && (
                    <p>
                      Bank account: ...
                      {payout.bank_account.last4}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}