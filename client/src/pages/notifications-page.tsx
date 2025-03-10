import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { format, parseISO } from "date-fns";

export default function NotificationsPage() {
  const { toast } = useToast();

  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/notifications");
      if (!response.ok) throw new Error("Failed to fetch notifications");
      return response.json();
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await apiRequest(
        "PATCH",
        `/api/notifications/${notificationId}/read`
      );
      if (!response.ok) throw new Error("Failed to mark notification as read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Success",
        description: "Notification marked as read",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleNotificationClick = async (notification: any) => {
    try {
      // Mark notification as read
      await markAsReadMutation.mutate(notification.id);

      // Handle feedback notifications
      if (notification.metadata?.feedbackId) {
        toast({
          title: "Feedback Details",
          description: notification.message,
        });
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>All Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No notifications
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification: any) => (
                <div
                  key={notification.id}
                  className={`flex items-start space-x-4 rounded-lg border p-4 hover:bg-accent cursor-pointer ${
                    notification.read ? "bg-muted/50" : "bg-background"
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold">
                      {notification.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notification.created_at && format(parseISO(notification.created_at), "PPp")}
                    </p>
                  </div>
                  {!notification.read && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsReadMutation.mutate(notification.id);
                      }}
                    >
                      Mark as read
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}