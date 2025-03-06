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
import { Link } from "wouter";
import LogsView from "./analytics-logs";
import { apiRequest } from "@/lib/queryClient";

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
  const [showLogs, setShowLogs] = useState(false);
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
    queryKey: ['/api/analytics/metrics'],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/analytics/metrics");
        if (!response.ok) {
          throw new Error(`Failed to fetch metrics: ${response.statusText}`);
        }
        return response.json();
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
          cpu_usage: metricsResponse.system?.cpu_usage || 0,
          memory_used: metricsResponse.system?.memory_used || 0,
          memory_total: metricsResponse.system?.memory_total || 0,
          timestamp: now
        }],
        api: [{
          request_count: metricsResponse.api?.request_count || 0,
          error_count: metricsResponse.api?.error_count || 0,
          avg_response_time: metricsResponse.api?.avg_response_time || 0,
          timestamp: now
        }],
        database: [{
          active_connections: metricsResponse.database?.active_connections || 0,
          query_duration: metricsResponse.database?.query_duration || 0,
          timestamp: now
        }]
      };

      setMetricsData(current => ({
        system: [...current.system.slice(-9), ...newData.system],
        api: [...current.api.slice(-9), ...newData.api],
        database: [...current.database.slice(-9), ...newData.database]
      }));
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
        <div className="flex gap-4">
          <Button
            variant={showLogs ? "secondary" : "outline"}
            onClick={() => setShowLogs(!showLogs)}
          >
            {showLogs ? "Show Metrics" : "Show System Logs"}
          </Button>
          <Button variant="outline" onClick={() => setLocation("/admin-management")}>
            Back to Dashboard
          </Button>
        </div>
      </div>

      {showLogs ? (
        <Card className="w-full h-[800px]">
          <CardHeader>
            <CardTitle>System Logs</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <LogsView />
          </CardContent>
        </Card>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}