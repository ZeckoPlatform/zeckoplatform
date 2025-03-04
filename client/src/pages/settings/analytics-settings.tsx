import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

type MetricData = {
  timestamp: number;
  memory: {
    heapTotal: number;
    heapUsed: number;
    rss: number;
  };
  requests: {
    total: number;
    errors: number;
  };
};

export default function AnalyticsSettingsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [metricsError, setMetricsError] = useState(false);

  // Redirect if user is not a super admin
  if (!user?.superAdmin) {
    setLocation("/");
    return null;
  }

  const { data: metrics, error } = useQuery({
    queryKey: ['/api/metrics'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No auth token');

      const response = await fetch('/api/metrics', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }

      return response.text();
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  useEffect(() => {
    if (error) {
      setMetricsError(true);
      toast({
        title: "Metrics Error",
        description: "Failed to load system metrics. Please try again later.",
        variant: "destructive"
      });
    }
  }, [error, toast]);

  // Parse metrics text into data for charts
  const parseMetrics = (metricsText: string): MetricData => {
    const memory: any = {};
    const requests: any = {};

    metricsText.split('\n').forEach(line => {
      if (line.startsWith('#')) return;

      if (line.includes('system_memory_bytes')) {
        const match = line.match(/type="(\w+)"\} (\d+)/);
        if (match) {
          memory[match[1]] = parseInt(match[2]);
        }
      }

      if (line.includes('http_requests_total')) {
        const match = line.match(/status_code="(\d+)"\} (\d+)/);
        if (match) {
          const isError = parseInt(match[1]) >= 400;
          if (isError) {
            requests.errors = (requests.errors || 0) + parseInt(match[2]);
          }
          requests.total = (requests.total || 0) + parseInt(match[2]);
        }
      }
    });

    return {
      timestamp: Date.now(),
      memory,
      requests
    };
  };

  const metricsData = metrics ? parseMetrics(metrics) : null;

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">System Analytics</h1>
        <Button variant="outline" onClick={() => setLocation("/admin-management")}>
          Back to Dashboard
        </Button>
      </div>

      {/* Memory Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Memory Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            {metricsError ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-destructive">Failed to load metrics. Please try again later.</p>
              </div>
            ) : metricsData ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[metricsData]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" type="number" domain={['auto', 'auto']} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="memory.heapTotal" name="Heap Total" stroke="#8884d8" />
                  <Line type="monotone" dataKey="memory.heapUsed" name="Heap Used" stroke="#82ca9d" />
                  <Line type="monotone" dataKey="memory.rss" name="RSS" stroke="#ffc658" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p>Loading metrics...</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Request Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Request Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-secondary">
              <h3 className="text-lg font-semibold">Total Requests</h3>
              <p className="text-2xl">{metricsData?.requests.total || 0}</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary">
              <h3 className="text-lg font-semibold">Error Rate</h3>
              <p className="text-2xl">
                {metricsData ? 
                  `${((metricsData.requests.errors / metricsData.requests.total) * 100).toFixed(2)}%` 
                  : '0%'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}