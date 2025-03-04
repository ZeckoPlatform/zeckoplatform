import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

export default function AnalyticsSettingsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [grafanaError, setGrafanaError] = useState(false);

  useEffect(() => {
    // Log auth state on component mount
    console.log('Analytics page auth state:', {
      isAuthenticated: !!user,
      isSuperAdmin: user?.superAdmin
    });
  }, [user]);

  // Redirect if user is not a super admin
  if (!user?.superAdmin) {
    console.log('Redirecting: Not super admin');
    setLocation("/");
    return null;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">System Analytics</h1>
        <Button variant="outline" onClick={() => setLocation("/admin-management")}>
          Back to Dashboard
        </Button>
      </div>

      {/* System Health Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[600px] rounded-lg overflow-hidden border">
            {grafanaError ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-destructive">Failed to load Grafana dashboard. Please try again later.</p>
              </div>
            ) : (
              <iframe
                src="/admin/analytics/grafana/d/system-health/system-health?orgId=1&kiosk"
                className="w-full h-full"
                frameBorder="0"
                title="System Health Dashboard"
                allow="fullscreen"
                style={{ 
                  border: 'none',
                  width: '100%',
                  height: '100%'
                }}
                onError={() => {
                  console.error('Grafana iframe load error');
                  setGrafanaError(true);
                  toast({
                    title: "Dashboard Error",
                    description: "Failed to load system metrics dashboard. Please ensure Grafana service is running.",
                    variant: "destructive"
                  });
                }}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}