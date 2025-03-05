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

  useEffect(() => {
    if (!user?.superAdmin) {
      setLocation("/");
      toast({
        title: "Access Denied",
        description: "You need super admin privileges to access this page.",
        variant: "destructive"
      });
    }
  }, [user, setLocation, toast]);

  // Debug current user
  useEffect(() => {
    console.log('Current user:', user);
  }, [user]);

  // Fetch metrics with auto-refresh
  const { data: metricsResponse, error } = useQuery({
    queryKey: ['/api/metrics/json'],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No auth token found');
          throw new Error('No auth token');
        }

        console.log('Fetching metrics with token:', token);
        const response = await fetch('/api/metrics/json', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to fetch metrics:', response.status, errorText);
          throw new Error(`Failed to fetch metrics: ${response.statusText}`);
        }

        const metrics = await response.json();
        console.log('Raw metrics response:', metrics);

        return metrics;
      } catch (err) {
        console.error('Error in metrics fetch:', err);
        throw err;
      }
    },
    refetchInterval: 5000,
    enabled: !!user?.superAdmin
  });

  // Process metrics data when available
  useEffect(() => {
    if (metricsResponse) {
      const now = Date.now();
      const newData = {
        system: [{
          cpu_usage: 0,
          memory_used: 0,
          memory_total: 0,
          timestamp: now
        }],
        api: [{
          request_count: 0,
          error_count: 0,
          avg_response_time: 0,
          timestamp: now
        }],
        database: [{
          active_connections: 0,
          query_duration: 0,
          timestamp: now
        }]
      };

      try {
        // Parse CPU metrics
        const cpuMetric = metricsResponse.find((m: any) => m.name === 'process_cpu_usage_percent');
        if (cpuMetric?.values?.length > 0) {
          newData.system[0].cpu_usage = parseFloat(cpuMetric.values[0].value);
          console.log('CPU usage:', newData.system[0].cpu_usage);
        }

        // Parse Memory metrics
        const memoryMetric = metricsResponse.find((m: any) => m.name === 'process_memory_usage_bytes');
        if (memoryMetric?.values?.length > 0) {
          const memoryBytes = parseFloat(memoryMetric.values[0].value);
          newData.system[0].memory_used = memoryBytes / (1024 * 1024); // Convert to MB
          console.log('Memory usage (MB):', newData.system[0].memory_used);
        }

        // Parse API metrics
        const requestMetrics = metricsResponse.filter((m: any) => m.name === 'http_requests_total');
        if (requestMetrics.length > 0) {
          const totalRequests = requestMetrics.reduce((sum: number, m: any) => 
            sum + (parseInt(m.values[0]?.value) || 0), 0);

          const errorRequests = requestMetrics
            .filter((m: any) => m.labels?.status_code && parseInt(m.labels.status_code) >= 400)
            .reduce((sum: number, m: any) => sum + (parseInt(m.values[0]?.value) || 0), 0);

          newData.api[0].request_count = totalRequests;
          newData.api[0].error_count = errorRequests;
          console.log('Request metrics:', { total: totalRequests, errors: errorRequests });
        }

        // Parse Database metrics
        const dbMetric = metricsResponse.find((m: any) => m.name === 'database_query_duration_seconds');
        if (dbMetric?.values?.length > 0) {
          newData.database[0].query_duration = parseFloat(dbMetric.values[0].value);
          console.log('Query duration:', newData.database[0].query_duration);
        }

        const connectionsMetric = metricsResponse.find((m: any) => m.name === 'database_connections_active');
        if (connectionsMetric?.values?.length > 0) {
          newData.database[0].active_connections = parseInt(connectionsMetric.values[0].value);
          console.log('Active connections:', newData.database[0].active_connections);
        }

        setMetricsData(current => ({
          system: [...current.system.slice(-9), ...newData.system],
          api: [...current.api.slice(-9), ...newData.api],
          database: [...current.database.slice(-9), ...newData.database]
        }));
      } catch (err) {
        console.error('Error processing metrics:', err);
      }
    }
  }, [metricsResponse]);

  if (!user?.superAdmin) {
    return null;
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
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
                <p className="text-destructive">Failed to load metrics</p>
              </div>
            ) : metricsData.system.length === 0 ? (
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
                  <YAxis yAxisId="left" domain={[0, 100]} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={formatBytes} />
                  <Tooltip 
                    labelFormatter={formatTime}
                    formatter={(value: any, name: string) => {
                      if (name.includes('Memory')) {
                        return [formatBytes(value), name];
                      }
                      return [`${value.toFixed(2)}%`, name];
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="cpu_usage"
                    name="CPU Usage (%)"
                    stroke="#8884d8"
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="memory_used"
                    name="Memory Usage"
                    stroke="#82ca9d"
                    dot={false}
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
            {error ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-destructive">Failed to load API metrics</p>
              </div>
            ) : metricsData.api.length === 0 ? (
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
                  <Tooltip 
                    labelFormatter={formatTime}
                    formatter={(value: number) => [`${value}`, 'Requests']}
                  />
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
            {error ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-destructive">Failed to load database metrics</p>
              </div>
            ) : metricsData.database.length === 0 ? (
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
                  <Tooltip 
                    labelFormatter={formatTime}
                    formatter={(value: number, name: string) => {
                      if (name.includes('Duration')) {
                        return [`${value.toFixed(3)}s`, name];
                      }
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="query_duration"
                    name="Query Duration (s)"
                    stroke="#8884d8"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="active_connections"
                    name="Active Connections"
                    stroke="#82ca9d"
                    dot={false}
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