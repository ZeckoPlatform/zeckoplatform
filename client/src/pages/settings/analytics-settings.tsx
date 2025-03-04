import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";

// Types for our metrics
type SystemMetrics = {
  cpu_usage: number;
  memory_used: number;
  memory_total: number;
  timestamp: number;
};

type APIMetrics = {
  request_count: number;
  error_count: number;
  avg_response_time: number;
  timestamp: number;
};

type DatabaseMetrics = {
  active_connections: number;
  query_duration: number;
  timestamp: number;
};

export default function AnalyticsSettingsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [metricsData, setMetricsData] = useState<{
    system: SystemMetrics[];
    api: APIMetrics[];
    database: DatabaseMetrics[];
  }>({
    system: [],
    api: [],
    database: []
  });

  // Redirect if user is not a super admin
  if (!user?.superAdmin) {
    setLocation("/");
    return null;
  }

  // Fetch metrics with auto-refresh
  const { error } = useQuery({
    queryKey: ['/api/metrics/json'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No auth token');

      const response = await fetch('/api/metrics/json', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch metrics:', response.statusText);
        throw new Error(`Failed to fetch metrics: ${response.statusText}`);
      }

      const metrics = await response.json();
      console.log('Metrics response:', metrics);

      // Transform metrics into time series data
      const now = Date.now();
      const systemMetric = metrics.find((m: any) => m.name === 'process_cpu_usage_percent');
      const memoryMetric = metrics.find((m: any) => m.name === 'process_memory_usage_bytes');
      const requestMetric = metrics.find((m: any) => m.name === 'http_requests_total');
      const dbMetric = metrics.find((m: any) => m.name === 'database_query_duration_seconds');

      const newData = {
        system: [{
          cpu_usage: systemMetric?.values[0]?.value || 0,
          memory_used: (memoryMetric?.values[0]?.value || 0) / (1024 * 1024), // Convert to MB
          memory_total: (memoryMetric?.values[0]?.value || 0) / (1024 * 1024),
          timestamp: now
        }],
        api: [{
          request_count: requestMetric?.values[0]?.value || 0,
          error_count: 0,
          avg_response_time: 0,
          timestamp: now
        }],
        database: [{
          active_connections: 0,
          query_duration: dbMetric?.values[0]?.value || 0,
          timestamp: now
        }]
      };

      return newData;
    },
    refetchInterval: 5000,
    onSuccess: (newData) => {
      setMetricsData(current => ({
        system: [...current.system.slice(-9), ...newData.system],
        api: [...current.api.slice(-9), ...newData.api],
        database: [...current.database.slice(-9), ...newData.database]
      }));
    },
    onError: (err) => {
      console.error('Metrics fetch error:', err);
      toast({
        title: "Metrics Error",
        description: "Failed to load system metrics. Please try again later.",
        variant: "destructive"
      });
    }
  });

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">System Monitoring</h1>
        <Button variant="outline" onClick={() => setLocation("/admin-management")}>
          Back to Dashboard
        </Button>
      </div>

      {/* System Health Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {metricsData.system.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p>Loading metrics...</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metricsData.system}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={formatTime}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip labelFormatter={formatTime} />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="cpu_usage"
                    name="CPU Usage (%)"
                    stroke="#8884d8"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="memory_used"
                    name="Memory (MB)"
                    stroke="#82ca9d"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* API Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>API Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {metricsData.api.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p>Loading API metrics...</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metricsData.api}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp"
                    tickFormatter={formatTime}
                  />
                  <YAxis />
                  <Tooltip labelFormatter={formatTime} />
                  <Legend />
                  <Bar dataKey="request_count" name="Total Requests" fill="#8884d8" />
                  <Bar dataKey="error_count" name="Error Count" fill="#ff8042" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Database Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Database Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {metricsData.database.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p>Loading database metrics...</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metricsData.database}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp"
                    tickFormatter={formatTime}
                  />
                  <YAxis />
                  <Tooltip labelFormatter={formatTime} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="query_duration"
                    name="Query Duration (s)"
                    stroke="#8884d8"
                  />
                  <Line
                    type="monotone"
                    dataKey="active_connections"
                    name="Active Connections"
                    stroke="#82ca9d"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}