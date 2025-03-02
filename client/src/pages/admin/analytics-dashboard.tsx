import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminAnalyticsDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch metrics data
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/metrics'],
    queryFn: async () => {
      const response = await fetch('/metrics');
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      return response.text();
    },
    enabled: user?.superAdmin === true,
    onError: (error) => {
      toast({
        title: "Error fetching metrics",
        description: error instanceof Error ? error.message : "Failed to load metrics data",
        variant: "destructive"
      });
    }
  });

  if (!user?.superAdmin) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p>You need super admin privileges to view this page.</p>
      </div>
    );
  }

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">System Analytics Dashboard</h1>

      <Tabs defaultValue="metrics" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="metrics">System Metrics</TabsTrigger>
          <TabsTrigger value="logs">Application Logs</TabsTrigger>
          <TabsTrigger value="alerts">Performance Alerts</TabsTrigger>
          <TabsTrigger value="database">Database Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">System Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <Card className="p-4">
                <h3 className="text-sm font-medium mb-2">API Response Times</h3>
                <pre className="bg-muted p-2 rounded-lg text-xs overflow-auto">
                  {metrics?.match(/http_request_duration_seconds.+/g)?.join('\n')}
                </pre>
              </Card>
              <Card className="p-4">
                <h3 className="text-sm font-medium mb-2">Request Counts</h3>
                <pre className="bg-muted p-2 rounded-lg text-xs overflow-auto">
                  {metrics?.match(/http_requests_total.+/g)?.join('\n')}
                </pre>
              </Card>
              <Card className="p-4">
                <h3 className="text-sm font-medium mb-2">Memory Usage</h3>
                <pre className="bg-muted p-2 rounded-lg text-xs overflow-auto">
                  {metrics?.match(/system_memory_bytes.+/g)?.join('\n')}
                </pre>
              </Card>
            </div>
            <details>
              <summary className="cursor-pointer text-sm font-medium mb-2">View Raw Metrics</summary>
              <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-[400px] text-xs">
                {metrics}
              </pre>
            </details>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Application Logs</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <select className="border rounded p-2">
                  <option value="error">Error Logs</option>
                  <option value="info">Info Logs</option>
                  <option value="debug">Debug Logs</option>
                </select>
                <input 
                  type="text" 
                  placeholder="Search logs..." 
                  className="border rounded p-2 flex-1"
                />
              </div>
              <div className="bg-muted p-4 rounded-lg h-[400px] overflow-auto">
                <p className="text-muted-foreground">Elasticsearch logs integration coming soon...</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Performance Alerts</h2>
            <div className="space-y-4">
              <Card className="p-4 border-l-4 border-yellow-500">
                <h3 className="font-medium">Response Time Alert</h3>
                <p className="text-sm text-muted-foreground">
                  Configure alert thresholds for API response times
                </p>
              </Card>
              <Card className="p-4 border-l-4 border-red-500">
                <h3 className="font-medium">Error Rate Alert</h3>
                <p className="text-sm text-muted-foreground">
                  Set up notifications for high error rates
                </p>
              </Card>
              <Card className="p-4 border-l-4 border-blue-500">
                <h3 className="font-medium">Resource Usage Alert</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor system resource utilization
                </p>
              </Card>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="database">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Database Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="text-sm font-medium mb-2">Query Performance</h3>
                <pre className="bg-muted p-2 rounded-lg text-xs overflow-auto">
                  {metrics?.match(/database_query_duration_seconds.+/g)?.join('\n')}
                </pre>
              </Card>
              <Card className="p-4">
                <h3 className="text-sm font-medium mb-2">Active Connections</h3>
                <pre className="bg-muted p-2 rounded-lg text-xs overflow-auto">
                  Coming soon...
                </pre>
              </Card>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}