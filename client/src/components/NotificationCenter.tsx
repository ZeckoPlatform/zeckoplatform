import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "./ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { ScrollArea } from "./ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Badge } from "./ui/badge";
import { useNotificationSound } from "@/lib/useNotificationSound";

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const playNotification = useNotificationSound();

  // WebSocket for real-time notifications
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = localStorage.getItem('token');
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/notifications?token=${token}`);

    ws.onmessage = (event) => {
      const notification = JSON.parse(event.data);
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });

      // Play sound based on severity
      if (notification.metadata?.severity === 'critical') {
        playNotification('send');
      } else {
        playNotification('receive');
      }

      // Show toast for real-time notification
      toast({
        title: notification.title,
        description: notification.message,
        variant: notification.metadata?.severity === 'critical' ? 'destructive' : 'default',
      });
    };

    return () => ws.close();
  }, [toast, playNotification]);

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
      await markAsReadMutation.mutate(notification.id);
      if (notification.link) {
        setLocation(notification.link);
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  // Get severity color for badge
  const getSeverityColor = (notification: any) => {
    // For test notifications, use the severity from metadata
    if (notification.type === 'test') {
      switch (notification.metadata?.severity) {
        case 'critical':
          return 'destructive';
        case 'warning':
          return 'warning';
        default:
          return 'secondary';
      }
    }

    // For existing notification types
    switch (notification.type) {
      case 'bug_report':
        return 'destructive';
      case 'customer_feedback':
        return 'success';
      default:
        return 'secondary';
    }
  };

  // Get notification type display text
  const getNotificationType = (notification: any) => {
    if (notification.type === 'test') {
      return notification.metadata?.severity?.toUpperCase() || 'INFO';
    }
    return notification.type.split('_').map((word: string) => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const unreadCount = notifications.filter((n: any) => !n.read).length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-[1.2rem] w-[1.2rem]" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center rounded-full"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <div className="flex justify-between items-center">
            <SheetTitle>Notifications</SheetTitle>
          </div>
        </SheetHeader>
        <ScrollArea className="h-[500px] mt-4 pr-4">
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
                    notification.read ? 'bg-muted/50' : 'bg-background'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-semibold ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {notification.title}
                      </h4>
                      <Badge variant={getSeverityColor(notification)}>
                        {getNotificationType(notification)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    {notification.created_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(notification.created_at), "PPp")}
                      </p>
                    )}
                  </div>
                  {!notification.read && (
                    <Button
                      variant="ghost"
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
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}