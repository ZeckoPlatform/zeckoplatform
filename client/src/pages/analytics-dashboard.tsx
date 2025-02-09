import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { Loader2, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function AnalyticsDashboard() {
  const { user } = useAuth();

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ["/api/analytics/dashboard"],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const {
    recentActivity,
    businessMetrics,
    revenueMetrics,
  } = analyticsData || {};

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const getRevenueChangeText = () => {
    if (!revenueMetrics?.total_revenue || !revenueMetrics?.revenue_breakdown) {
      return null;
    }

    const currentRevenue = parseFloat(revenueMetrics.total_revenue.toString());
    const previousRevenue = revenueMetrics.revenue_breakdown.previous_month || 0;

    if (previousRevenue === 0) {
      return currentRevenue > 0 ? "First month of revenue" : null;
    }

    const percentageChange = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
    const isPositive = percentageChange > 0;

    return (
      <p className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? '+' : ''}{percentageChange.toFixed(1)}% from last month
      </p>
    );
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Analytics Dashboard</h1>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenue
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {revenueMetrics?.total_revenue
                ? formatCurrency(parseFloat(revenueMetrics.total_revenue.toString()))
                : "£0.00"}
            </div>
            {getRevenueChangeText()}
          </CardContent>
        </Card>

        {user?.userType === "business" && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Lead Responses
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {businessMetrics?.total_responses || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {businessMetrics?.metrics?.response_rate}% response rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Conversion Rate
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {businessMetrics?.metrics?.conversion_rate || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {businessMetrics?.successful_conversions || 0} successful conversions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Activity Score
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {businessMetrics?.activity_score || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Based on recent activity
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Revenue Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
          <CardDescription>Monthly revenue breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={revenueMetrics?.revenue_breakdown || []}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest actions and events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {recentActivity?.map((activity: any) => (
              <div
                key={activity.id}
                className="flex items-center"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {activity.event_type}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(activity.created_at), "PPp")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}