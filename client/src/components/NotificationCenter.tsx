import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/notifications");
      if (!response.ok) throw new Error("Failed to fetch notifications");
      return response.json();
    },
  });

  const { data: preferences } = useQuery({
    queryKey: ["/api/notification-preferences"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/notification-preferences");
      if (!response.ok) throw new Error("Failed to fetch notification preferences");
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

  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPreferences: any) => {
      const response = await apiRequest(
        "PATCH",
        "/api/notification-preferences",
        newPreferences
      );
      if (!response.ok) throw new Error("Failed to update preferences");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-preferences"] });
      toast({
        title: "Success",
        description: "Notification preferences updated",
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

  const handlePreferenceChange = (key: string, value: boolean | number) => {
    if (!preferences) return;
    updatePreferencesMutation.mutate({ ...preferences, [key]: value });
  };

  const handleViewAll = () => {
    setOpen(false); // Close the notification sheet
    setLocation("/notifications"); // Navigate to notifications page
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-[1.2rem] w-[1.2rem]" />
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center">
              {notifications.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <div className="flex justify-between items-center">
            <SheetTitle>Notifications</SheetTitle>
            <Button variant="outline" size="sm" onClick={handleViewAll}>
              View All
            </Button>
          </div>
        </SheetHeader>
        <Tabs defaultValue="notifications" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>
          <TabsContent value="notifications">
            <ScrollArea className="h-[500px] pr-4">
              {notifications.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No new notifications
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification: any) => (
                    <div
                      key={notification.id}
                      className="flex items-start space-x-4 rounded-lg border p-4"
                    >
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold">
                          {notification.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsReadMutation.mutate(notification.id)}
                      >
                        Mark as read
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          <TabsContent value="preferences">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Renewal Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications before subscription renewal
                  </p>
                </div>
                <Switch
                  checked={preferences?.renewal_reminder}
                  onCheckedChange={(checked) =>
                    handlePreferenceChange("renewal_reminder", checked)
                  }
                />
              </div>

              {preferences?.renewal_reminder && (
                <div className="space-y-2">
                  <Label>Days before renewal</Label>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={preferences.reminder_days_before}
                    onChange={(e) =>
                      handlePreferenceChange(
                        "reminder_days_before",
                        parseInt(e.target.value)
                      )
                    }
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Invoice Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications when new invoices are available
                  </p>
                </div>
                <Switch
                  checked={preferences?.invoice_available}
                  onCheckedChange={(checked) =>
                    handlePreferenceChange("invoice_available", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Payment Failure Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications if a payment fails
                  </p>
                </div>
                <Switch
                  checked={preferences?.payment_failed}
                  onCheckedChange={(checked) =>
                    handlePreferenceChange("payment_failed", checked)
                  }
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}