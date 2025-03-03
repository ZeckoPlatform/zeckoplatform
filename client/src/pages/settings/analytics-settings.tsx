import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { BarChart, LineChart, PieChart } from "lucide-react";

export default function AnalyticsSettingsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect if user is not a super admin
  if (!user?.superAdmin) {
    setLocation("/");
    return null;
  }

  const grafanaUrl = `/admin/analytics/grafana/d/system-health/system-health-dashboard?orgId=1&kiosk&theme=light`;

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Analytics Settings</h1>
        <Button variant="outline" onClick={() => setLocation("/admin-management")}>
          Back to Dashboard
        </Button>
      </div>

      <div className="w-full h-[600px] rounded-lg overflow-hidden border mb-8">
        <iframe
          src={`/admin/analytics/grafana/d/system-health/system-health-dashboard?orgId=1&kiosk&theme=light`}
          className="w-full h-full"
          frameBorder="0"
          title="Grafana Dashboard"
          allow="fullscreen"
          style={{ 
            border: 'none',
            width: '100%',
            height: '100%'
          }}
          onLoad={(e) => {
            const iframe = e.target as HTMLIFrameElement;
            if (iframe.contentWindow) {
              // Forward the JWT token
              iframe.contentWindow.postMessage(
                { 
                  type: 'authorization',
                  token: `Bearer ${user?.token}`
                },
                '*'
              );

              // Handle authentication errors
              const handleMessage = (event: MessageEvent) => {
                if (event.data.type === 'grafana-error') {
                  console.error('Grafana authentication error:', event.data.error);
                }
              };

              window.addEventListener('message', handleMessage);
              return () => window.removeEventListener('message', handleMessage);
            }
          }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Collection</CardTitle>
          <CardDescription>Configure analytics data collection preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-center space-x-4">
              <Label>Track User Sessions</Label>
              <Input type="checkbox" defaultChecked />
            </div>
            <div className="flex items-center space-x-4">
              <Label>Collect Usage Metrics</Label>
              <Input type="checkbox" defaultChecked />
            </div>
            <div className="flex items-center space-x-4">
              <Label>Store Historical Data (days)</Label>
              <Input type="number" defaultValue={90} min={30} max={365} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Report Generation</CardTitle>
          <CardDescription>Configure automated report settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-center space-x-4">
              <Label>Generate Weekly Reports</Label>
              <Input type="checkbox" defaultChecked />
            </div>
            <div className="flex items-center space-x-4">
              <Label>Include Revenue Analysis</Label>
              <Input type="checkbox" defaultChecked />
            </div>
            <div className="flex items-center space-x-4">
              <Label>User Activity Reports</Label>
              <Input type="checkbox" defaultChecked />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>Configure performance monitoring settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-center space-x-4">
              <Label>Monitor API Response Times</Label>
              <Input type="checkbox" defaultChecked />
            </div>
            <div className="flex items-center space-x-4">
              <Label>Track Error Rates</Label>
              <Input type="checkbox" defaultChecked />
            </div>
            <div className="flex items-center space-x-4">
              <Label>Performance Alert Threshold (ms)</Label>
              <Input type="number" defaultValue={1000} min={100} max={5000} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}