import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { DateRangePicker } from "@/components/ui/date-range-picker";

type LogEntry = {
  '@timestamp': string;
  level: 'info' | 'error' | 'warning';
  message: string;
  service: string;
  category: string;
  metadata: Record<string, any>;
};

type ErrorSummary = {
  count: number;
  timestamp: string;
  type: string;
};

export default function AnalyticsLogsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [errorStats, setErrorStats] = useState<ErrorSummary[]>([]);

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

  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ["/api/logs", { search, level, category, dateRange }],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No auth token');

      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (level !== 'all') params.append('level', level);
      if (category !== 'all') params.append('category', category);
      if (dateRange.from) params.append('from', dateRange.from.toISOString());
      if (dateRange.to) params.append('to', dateRange.to.toISOString());

      const response = await fetch(`/api/logs?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      const data = await response.json();
      processErrorStats(data);
      return data;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
    enabled: !!user?.superAdmin
  });

  // Process error statistics
  const processErrorStats = (logs: LogEntry[]) => {
    const errorLogs = logs.filter(log => log.level === 'error');
    const stats = errorLogs.reduce((acc: Record<string, number>, log) => {
      const type = log.category || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const summaryData = Object.entries(stats).map(([type, count]) => ({
      type,
      count,
      timestamp: new Date().toISOString()
    }));

    setErrorStats(summaryData);
  };

  if (!user?.superAdmin) {
    return null;
  }

  const formatTimestamp = (timestamp: string) => {
    return format(new Date(timestamp), 'yyyy-MM-dd HH:mm:ss');
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      default:
        return 'text-green-500';
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">System Logs</h1>
        <Button variant="outline" onClick={() => setLocation("/settings/analytics")}>
          Back to Analytics
        </Button>
      </div>

      {/* Error Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Error Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={errorStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Error Count" fill="#ff4d4f" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Log Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Log Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search logs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="api">API Requests</SelectItem>
                  <SelectItem value="database">Database</SelectItem>
                  <SelectItem value="auth">Authentication</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading logs...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              Failed to load logs: {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Service</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log: LogEntry, index: number) => (
                    <TableRow 
                      key={`${log['@timestamp']}-${index}`}
                      className={log.level === 'error' ? 'bg-red-50' : undefined}
                    >
                      <TableCell>{formatTimestamp(log['@timestamp'])}</TableCell>
                      <TableCell className={getLevelColor(log.level)}>
                        {log.level.toUpperCase()}
                      </TableCell>
                      <TableCell>{log.category}</TableCell>
                      <TableCell className="max-w-xl truncate">{log.message}</TableCell>
                      <TableCell>{log.service}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}