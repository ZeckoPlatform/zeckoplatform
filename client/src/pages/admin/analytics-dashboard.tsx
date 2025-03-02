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
    queryKey: ['/metrics'],
    queryFn: async () => {
      const response = await fetch('/metrics');
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      return response.text();
    },
    enabled: user?.superAdmin === true,
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
        <TabsList>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">System Metrics</h2>
            <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-[600px]">
              {metrics}
            </pre>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">System Logs</h2>
            <p>Elasticsearch logs integration coming soon...</p>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Alert Configuration</h2>
            <p>Alert management interface coming soon...</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}