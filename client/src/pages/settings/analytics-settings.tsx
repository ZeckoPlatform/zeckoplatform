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
    queryKey: ['/api/metrics'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No auth token');

      console.log('Fetching metrics...');
      const response = await fetch('/api/metrics', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`);
      }

      const text = await response.text();
      console.log('Raw metrics:', text);
      return text;
    },
    refetchInterval: 5000,
    onSuccess: (metricsText) => {
      try {
        const parsedData = parseMetrics(metricsText);
        console.log('Parsed metrics:', parsedData);
        setMetricsData(curr => ({
          system: [...(curr.system || []).slice(-10), ...parsedData.system],
          api: [...(curr.api || []).slice(-10), ...parsedData.api],
          database: [...(curr.database || []).slice(-10), ...parsedData.database]
        }));
      } catch (err) {
        console.error('Error parsing metrics:', err);
        toast({
          title: "Metrics Parse Error",
          description: "Failed to parse metrics data. Check console for details.",
          variant: "destructive"
        });
      }
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

  // Parse Prometheus metrics into structured data
  const parseMetrics = (metricsText: string) => {
    const data = {
      system: [] as SystemMetrics[],
      api: [] as APIMetrics[],
      database: [] as DatabaseMetrics[]
    };

    const lines = metricsText.split('\n');
    console.log('Processing metrics lines:', lines.length);

    lines.forEach(line => {
      if (line.startsWith('#') || !line.trim()) return;

      try {
        // Parse system metrics
        if (line.includes('process_cpu_usage_percent')) {
          const match = line.match(/\{.*?\} ([\d.]+)/);
          if (match) {
            data.system.push({
              cpu_usage: parseFloat(match[1]),
              memory_used: 0,
              memory_total: 0,
              timestamp: Date.now()
            });
          }
        }

        // Parse memory metrics
        if (line.includes('process_memory_usage_bytes')) {
          const match = line.match(/type="(\w+)"\} ([\d.]+)/);
          if (match && match[1] === 'heapUsed') {
            const lastSystemMetric = data.system[data.system.length - 1];
            if (lastSystemMetric) {
              lastSystemMetric.memory_used = parseInt(match[2]) / (1024 * 1024); // Convert to MB
            }
          }
        }

        // Parse API metrics
        if (line.includes('http_requests_total')) {
          const match = line.match(/status_code="(\d+)"\} ([\d.]+)/);
          if (match) {
            const statusCode = parseInt(match[1]);
            const count = parseInt(match[2]);
            data.api.push({
              request_count: count,
              error_count: statusCode >= 400 ? count : 0,
              avg_response_time: 0,
              timestamp: Date.now()
            });
          }
        }

        // Parse Database metrics
        if (line.includes('database_query_duration_seconds')) {
          const match = line.match(/\{.*?\} ([\d.]+)/);
          if (match) {
            data.database.push({
              active_connections: 0,
              query_duration: parseFloat(match[1]),
              timestamp: Date.now()
            });
          }
        }
      } catch (err) {
        console.error('Error parsing metric line:', line, err);
      }
    });

    return data;
  };

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
            {error ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-destructive">Failed to load metrics.</p>
              </div>
            ) : metricsData.system.length > 0 ? (
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
            ) : (
              <div className="flex items-center justify-center h-full">
                <p>Loading metrics...</p>
              </div>
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
            {metricsData.api.length > 0 ? (
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
            ) : (
              <div className="flex items-center justify-center h-full">
                <p>Loading API metrics...</p>
              </div>
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
            {metricsData.database.length > 0 ? (
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
            ) : (
              <div className="flex items-center justify-center h-full">
                <p>Loading database metrics...</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}