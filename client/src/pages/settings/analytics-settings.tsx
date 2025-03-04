import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function AnalyticsSettingsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Redirect if user is not a super admin
  if (!user?.superAdmin) {
    setLocation("/");
    return null;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Analytics Settings</h1>
        <Button variant="outline" onClick={() => setLocation("/admin-management")}>
          Back to Dashboard
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[600px] rounded-lg overflow-hidden border">
            <iframe
              src="/admin/analytics/grafana/d/system-health/system-health-dashboard?orgId=1&kiosk&theme=light"
              className="w-full h-full"
              frameBorder="0"
              title="Grafana Dashboard"
              allow="fullscreen"
              style={{ 
                border: 'none',
                width: '100%',
                height: '100%'
              }}
              onError={() => {
                toast({
                  title: "Dashboard Error",
                  description: "Failed to load metrics dashboard. Please try refreshing the page.",
                  variant: "destructive"
                });
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}