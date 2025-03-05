import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Log {
  '@timestamp': string;
  timestamp?: string; // For backward compatibility
  level: string;
  message: string;
  service: string;
  category: string;
  metadata: any;
}

export default function LogViewer() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({
    level: 'all',
    category: 'all',
    search: ''
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

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No auth token');

      const response = await fetch('/api/admin/logs', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      const data = await response.json();
      setLogs(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch logs. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.superAdmin) {
      fetchLogs();
    }
  }, [user]);

  const filteredLogs = logs.filter(log => {
    const matchesLevel = filter.level === 'all' || log.level === filter.level;
    const matchesCategory = filter.category === 'all' || log.category === filter.category;
    const matchesSearch = !filter.search || 
      log.message.toLowerCase().includes(filter.search.toLowerCase()) ||
      JSON.stringify(log.metadata).toLowerCase().includes(filter.search.toLowerCase());

    return matchesLevel && matchesCategory && matchesSearch;
  });

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  if (!user?.superAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">System Logs</h1>
        <Button 
          variant="outline" 
          onClick={fetchLogs}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search logs..."
                value={filter.search}
                onChange={(e) => setFilter(f => ({ ...f, search: e.target.value }))}
                className="w-full"
                startIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <Select
              value={filter.level}
              onValueChange={(value) => setFilter(f => ({ ...f, level: value }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filter.category}
              onValueChange={(value) => setFilter(f => ({ ...f, category: value }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="request">Requests</SelectItem>
                <SelectItem value="error">Errors</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filteredLogs.map((log, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {formatDate(log['@timestamp'] || log.timestamp || '')}
                  </p>
                  <p className="font-medium">{log.message}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    log.level === 'error' ? 'bg-destructive/10 text-destructive' :
                    log.level === 'warn' ? 'bg-warning/10 text-warning' :
                    'bg-primary/10 text-primary'
                  }`}>
                    {log.level}
                  </span>
                  <span className="px-2 py-1 rounded-full text-xs bg-secondary text-secondary-foreground">
                    {log.category}
                  </span>
                </div>
              </div>
              {log.metadata && (
                <pre className="mt-2 p-2 bg-muted rounded-md text-xs overflow-x-auto">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}