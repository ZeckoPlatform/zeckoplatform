import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Loader2, Download, ExternalLink } from "lucide-react";
import { format } from "date-fns";

export default function BillingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const { data: invoices = [] } = useQuery({
    queryKey: ["/api/invoices"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/invoices");
      if (!response.ok) throw new Error("Failed to fetch invoices");
      return response.json();
    },
  });

  const { data: preferences } = useQuery({
    queryKey: ["/api/notification-preferences"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/notification-preferences");
      if (!response.ok) throw new Error("Failed to fetch notification preferences");
      return response.json();
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPreferences: any) => {
      const response = await apiRequest(
        "PATCH",
        "/api/notification-preferences",
        newPreferences
      );
      if (!response.ok) throw new Error("Failed to update preferences");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-preferences"] });
      toast({
        title: "Success",
        description: "Notification preferences updated successfully",
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

  const syncInvoicesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/invoices/sync");
      if (!response.ok) throw new Error("Failed to sync invoices");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Invoices synced successfully",
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

  const handlePreferenceChange = (key: string, value: boolean | number) => {
    if (!preferences) return;
    updatePreferencesMutation.mutate({ ...preferences, [key]: value });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Billing & Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Invoice History</h3>
                <Button
                  variant="outline"
                  onClick={() => syncInvoicesMutation.mutate()}
                  disabled={syncInvoicesMutation.isPending}
                >
                  {syncInvoicesMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Sync Invoices"
                  )}
                </Button>
              </div>

              <div className="space-y-4">
                {invoices.map((invoice: any) => (
                  <div
                    key={invoice.id}
                    className="flex justify-between items-center p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        Invoice #{invoice.stripe_invoice_id}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(invoice.created_at), "PPP")}
                      </p>
                      <p className="text-sm">
                        Amount: {(invoice.amount / 100).toFixed(2)} {invoice.currency.toUpperCase()}
                      </p>
                      <p className="text-sm capitalize">Status: {invoice.status}</p>
                    </div>
                    <div className="flex gap-2">
                      {invoice.invoice_pdf && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(invoice.invoice_pdf, "_blank")}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      )}
                      {invoice.hosted_invoice_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(invoice.hosted_invoice_url, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Online
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {invoices.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No invoices found
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Renewal Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications before subscription renewal
                  </p>
                </div>
                <Switch
                  checked={preferences?.renewal_reminder}
                  onCheckedChange={(checked) =>
                    handlePreferenceChange("renewal_reminder", checked)
                  }
                />
              </div>

              {preferences?.renewal_reminder && (
                <div className="space-y-2">
                  <Label>Days before renewal</Label>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={preferences.reminder_days_before}
                    onChange={(e) =>
                      handlePreferenceChange(
                        "reminder_days_before",
                        parseInt(e.target.value)
                      )
                    }
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Invoice Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications when new invoices are available
                  </p>
                </div>
                <Switch
                  checked={preferences?.invoice_available}
                  onCheckedChange={(checked) =>
                    handlePreferenceChange("invoice_available", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Payment Failure Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications if a payment fails
                  </p>
                </div>
                <Switch
                  checked={preferences?.payment_failed}
                  onCheckedChange={(checked) =>
                    handlePreferenceChange("payment_failed", checked)
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
