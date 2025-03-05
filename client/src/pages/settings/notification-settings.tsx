import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Bell, Mail, AlertTriangle, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";

type NotificationPreference = {
  email: boolean;
  critical_alerts: boolean;
  api_failures: boolean;
  system_metrics: boolean;
  database_issues: boolean;
  security_alerts: boolean;
};

export default function NotificationSettingsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreference>({
    email: true,
    critical_alerts: true,
    api_failures: true,
    system_metrics: true,
    database_issues: true,
    security_alerts: true,
  });
  const [isTesting, setIsTesting] = useState(false);

  // WebSocket connection for real-time notifications
  useEffect(() => {
    if (!user?.superAdmin) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = localStorage.getItem('token');
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/notifications?token=${token}`);

    ws.onmessage = (event) => {
      const notification = JSON.parse(event.data);
      toast({
        title: notification.title,
        description: notification.message,
        variant: notification.severity === 'critical' ? 'destructive' : 'default',
      });
    };

    return () => {
      ws.close();
    };
  }, [user, toast]);

  // Load preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await apiRequest('GET', '/api/notification-preferences');
        if (response.ok) {
          const data = await response.json();
          setPreferences(data);
        }
      } catch (error) {
        console.error('Failed to load notification preferences:', error);
      }
    };

    if (user?.superAdmin) {
      loadPreferences();
    }
  }, [user]);

  // Save preferences
  const savePreferences = async () => {
    try {
      const response = await apiRequest('PATCH', '/api/notification-preferences', preferences);
      if (response.ok) {
        toast({
          title: "Success",
          description: "Notification preferences updated successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update notification preferences",
        variant: "destructive",
      });
    }
  };

  // Test notifications
  const testNotifications = async () => {
    setIsTesting(true);
    try {
      // Test info notification
      await apiRequest('POST', '/api/notifications/test', {
        type: 'info',
        message: 'This is a test info notification',
        severity: 'info'
      });

      // Wait 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Test warning notification
      await apiRequest('POST', '/api/notifications/test', {
        type: 'warning',
        message: 'This is a test warning notification',
        severity: 'warning'
      });

      // Wait 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Test critical notification
      await apiRequest('POST', '/api/notifications/test', {
        type: 'critical',
        message: 'This is a test critical notification',
        severity: 'critical'
      });

      toast({
        title: "Success",
        description: "Test notifications sent successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send test notifications",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Redirect if user is not a super admin
  if (!user?.superAdmin) {
    setLocation("/");
    return null;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Notification Settings</h1>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => setLocation("/admin-management")}>
            Back to Dashboard
          </Button>
          <Button 
            onClick={testNotifications} 
            disabled={isTesting}
          >
            {isTesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Notifications'
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alert Channels</CardTitle>
          <CardDescription>Configure how you want to receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4" />
              <Label>Email Notifications</Label>
            </div>
            <Switch
              checked={preferences.email}
              onCheckedChange={(checked) => 
                setPreferences(prev => ({ ...prev, email: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>Choose which types of alerts you want to receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <Label>Critical System Alerts</Label>
            </div>
            <Switch
              checked={preferences.critical_alerts}
              onCheckedChange={(checked) => 
                setPreferences(prev => ({ ...prev, critical_alerts: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4 text-yellow-500" />
              <Label>API Failure Notifications</Label>
            </div>
            <Switch
              checked={preferences.api_failures}
              onCheckedChange={(checked) => 
                setPreferences(prev => ({ ...prev, api_failures: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4 text-blue-500" />
              <Label>System Metrics Alerts</Label>
            </div>
            <Switch
              checked={preferences.system_metrics}
              onCheckedChange={(checked) => 
                setPreferences(prev => ({ ...prev, system_metrics: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4 text-orange-500" />
              <Label>Database Issue Alerts</Label>
            </div>
            <Switch
              checked={preferences.database_issues}
              onCheckedChange={(checked) => 
                setPreferences(prev => ({ ...prev, database_issues: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4 text-purple-500" />
              <Label>Security Alert Notifications</Label>
            </div>
            <Switch
              checked={preferences.security_alerts}
              onCheckedChange={(checked) => 
                setPreferences(prev => ({ ...prev, security_alerts: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={savePreferences}>
          Save Preferences
        </Button>
      </div>
    </div>
  );
}