import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle2, Download, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";

export default function VendorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const { data: accountStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["/api/vendor/stripe/account/status"],
    enabled: user?.stripeAccountId !== undefined,
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

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Vendor Dashboard</h1>

      <div className="grid gap-8 grid-cols-1 md:grid-cols-2">
        {/* Account Status Card */}
        <Card>
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

        {/* Balance Card */}
        {accountStatus?.status === "enabled" && (
          <Card>
            <CardHeader>
              <CardTitle>Current Balance</CardTitle>
              <CardDescription>Your available and pending balances</CardDescription>
            </CardHeader>
            <CardContent>
              {balanceLoading ? (
                <div className="flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : balance ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Available</p>
                    <p className="text-2xl font-bold">
                      £{((balance.available?.[0]?.amount || 0) / 100).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-xl">
                      £{((balance.pending?.[0]?.amount || 0) / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
              ) : (
                <p>Failed to load balance information</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Transaction History */}
      {accountStatus?.status === "enabled" && (
        <Card className="mt-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>Your recent transactions and payouts</CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => syncTransactionsMutation.mutate()}
                disabled={syncTransactionsMutation.isPending}
              >
                {syncTransactionsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Sync Transactions"
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : transactions.length > 0 ? (
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
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                No transactions found
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payouts History */}
      {accountStatus?.status === "enabled" && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Payout History</CardTitle>
            <CardDescription>Recent payouts to your bank account</CardDescription>
          </CardHeader>
          <CardContent>
            {payoutsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : payouts.data?.length > 0 ? (
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
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                No payouts found
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}