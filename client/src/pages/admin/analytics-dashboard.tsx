import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";

// Helper function to parse Prometheus metrics
function parseMetrics(metricsText: string) {
  const metrics = {
    httpRequests: [] as string[],
    responseTimes: [] as string[],
    memory: [] as string[],
    database: [] as string[],
    errors: [] as string[]
  };

  const lines = metricsText.split('\n');
  lines.forEach(line => {
    if (line.startsWith('#')) return; // Skip comments

    if (line.includes('http_request_duration_seconds')) {
      metrics.responseTimes.push(line);
    } else if (line.includes('http_requests_total')) {
      metrics.httpRequests.push(line);
    } else if (line.includes('system_memory_bytes')) {
      metrics.memory.push(line);
    } else if (line.includes('database_query_duration')) {
      metrics.database.push(line);
    } else if (line.includes('api_errors_total')) {
      metrics.errors.push(line);
    }
  });

  return metrics;
}

// Format metric values for display
function formatMetricValue(value: string): string {
  const match = value.match(/\{.*?\}\s*([\d.]+)/);
  if (!match) return value;
  const num = parseFloat(match[1]);
  if (num > 1000000) return `${(num / 1000000).toFixed(2)}M`;
  if (num > 1000) return `${(num / 1000).toFixed(2)}K`;
  return num.toFixed(2);
}

export default function AdminAnalyticsDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch metrics data
  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/metrics'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/metrics');
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      const text = await response.text();
      return parseMetrics(text);
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">System Analytics Dashboard</h1>
        <Button
          variant="outline"
          onClick={() => window.open('/admin/analytics/grafana', '_blank')}
        >
          Open Grafana Dashboard
        </Button>
      </div>

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
                <div className="bg-muted p-2 rounded-lg text-xs space-y-1">
                  {metricsData?.responseTimes.map((metric, i) => (
                    <div key={i} className="font-mono">
                      {formatMetricValue(metric)} ms
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-4">
                <h3 className="text-sm font-medium mb-2">Request Counts</h3>
                <div className="bg-muted p-2 rounded-lg text-xs space-y-1">
                  {metricsData?.httpRequests.map((metric, i) => (
                    <div key={i} className="font-mono">
                      {formatMetricValue(metric)} requests
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-4">
                <h3 className="text-sm font-medium mb-2">Memory Usage</h3>
                <div className="bg-muted p-2 rounded-lg text-xs space-y-1">
                  {metricsData?.memory.map((metric, i) => (
                    <div key={i} className="font-mono">
                      {formatMetricValue(metric)} MB
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <details>
              <summary className="cursor-pointer text-sm font-medium mb-2">View Raw Metrics</summary>
              <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-[400px] text-xs">
                {Object.entries(metricsData || {}).map(([key, values]) => (
                  `${key}:\n${values.join('\n')}\n`
                ))}
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
                {metricsData?.errors.length ? (
                  <div className="space-y-2">
                    {metricsData.errors.map((error, i) => (
                      <div key={i} className="text-sm text-red-500 font-mono">
                        {error}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No errors logged</p>
                )}
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
                  {metricsData?.responseTimes.length ?
                    `Current average response time: ${formatMetricValue(metricsData.responseTimes[0])} ms` :
                    'No response time data available'
                  }
                </p>
              </Card>
              <Card className="p-4 border-l-4 border-red-500">
                <h3 className="font-medium">Error Rate Alert</h3>
                <p className="text-sm text-muted-foreground">
                  {metricsData?.errors.length ?
                    `Total errors: ${metricsData.errors.length}` :
                    'No errors detected'
                  }
                </p>
              </Card>
              <Card className="p-4 border-l-4 border-blue-500">
                <h3 className="font-medium">Resource Usage Alert</h3>
                <p className="text-sm text-muted-foreground">
                  {metricsData?.memory.length ?
                    `Memory usage: ${formatMetricValue(metricsData.memory[0])} MB` :
                    'No memory usage data available'
                  }
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
                <div className="bg-muted p-2 rounded-lg text-xs space-y-1">
                  {metricsData?.database.map((metric, i) => (
                    <div key={i} className="font-mono">
                      {formatMetricValue(metric)} ms
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-4">
                <h3 className="text-sm font-medium mb-2">Active Connections</h3>
                <div className="bg-muted p-2 rounded-lg text-xs">
                  {metricsData?.database.length ?
                    `${metricsData.database.length} active queries` :
                    'No active database connections'
                  }
                </div>
              </Card>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}