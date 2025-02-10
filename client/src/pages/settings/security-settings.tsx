import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Shield, Key, Lock, Smartphone, Clock, Bell, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export default function SecuritySettingsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [show2FAQRCode, setShow2FAQRCode] = useState(false);

  // Security preferences query
  const { data: securityPreferences } = useQuery({
    queryKey: ["/api/security-preferences"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/security-preferences");
      if (!response.ok) throw new Error("Failed to fetch security preferences");
      return response.json();
    },
  });

  // Security activity log query
  const { data: activityLog = [] } = useQuery({
    queryKey: ["/api/security/activity-log"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/security/activity-log");
      if (!response.ok) throw new Error("Failed to fetch activity log");
      return response.json();
    },
  });

  // 2FA setup mutation
  const setup2FAMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/security/2fa/setup");
      if (!response.ok) throw new Error("Failed to setup 2FA");
      return response.json();
    },
    onSuccess: () => {
      setShow2FAQRCode(true);
      toast({
        title: "2FA Setup Initiated",
        description: "Please scan the QR code with your authenticator app",
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

  // Update security preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (preferences: any) => {
      const response = await apiRequest("PATCH", "/api/security-preferences", preferences);
      if (!response.ok) throw new Error("Failed to update preferences");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/security-preferences"] });
      toast({
        title: "Success",
        description: "Security preferences updated successfully",
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

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Security Settings</h1>
        <Button variant="outline" onClick={() => setLocation("/admin-management")}>
          Back to Dashboard
        </Button>
      </div>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Two-Factor Authentication (2FA)
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account with 2FA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable 2FA</Label>
              <p className="text-sm text-muted-foreground">
                Use an authenticator app to generate verification codes
              </p>
            </div>
            <Switch
              checked={securityPreferences?.twoFactorEnabled}
              onCheckedChange={(checked) => {
                if (checked) {
                  setup2FAMutation.mutate();
                } else {
                  updatePreferencesMutation.mutate({ twoFactorEnabled: false });
                }
              }}
            />
          </div>
          {show2FAQRCode && (
            <div className="mt-4 p-4 border rounded-lg">
              <p className="text-sm mb-2">
                Scan this QR code with your authenticator app:
              </p>
              {/* QR Code would be displayed here */}
              <div className="bg-gray-100 w-48 h-48 mx-auto" />
              <Button
                className="mt-4"
                onClick={() => setShow2FAQRCode(false)}
              >
                Done
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Password Security
          </CardTitle>
          <CardDescription>
            Manage your password settings and requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Strong Password Requirement</Label>
              <p className="text-sm text-muted-foreground">
                Require complex passwords with special characters
              </p>
            </div>
            <Switch
              checked={securityPreferences?.requireStrongPassword}
              onCheckedChange={(checked) =>
                updatePreferencesMutation.mutate({ requireStrongPassword: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Password Expiry</Label>
              <p className="text-sm text-muted-foreground">
                Require password change every 90 days
              </p>
            </div>
            <Switch
              checked={securityPreferences?.passwordExpiry}
              onCheckedChange={(checked) =>
                updatePreferencesMutation.mutate({ passwordExpiry: checked })
              }
            />
          </div>
          <Button variant="outline" className="w-full">
            Change Password
          </Button>
        </CardContent>
      </Card>

      {/* Login Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Login Security
          </CardTitle>
          <CardDescription>
            Configure advanced login security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Trusted Devices Only</Label>
              <p className="text-sm text-muted-foreground">
                Only allow login from recognized devices
              </p>
            </div>
            <Switch
              checked={securityPreferences?.trustedDevicesOnly}
              onCheckedChange={(checked) =>
                updatePreferencesMutation.mutate({ trustedDevicesOnly: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Location-based Security</Label>
              <p className="text-sm text-muted-foreground">
                Get alerts for logins from new locations
              </p>
            </div>
            <Switch
              checked={securityPreferences?.locationBasedSecurity}
              onCheckedChange={(checked) =>
                updatePreferencesMutation.mutate({ locationBasedSecurity: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Session Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Session Management
          </CardTitle>
          <CardDescription>
            Manage your active sessions and session settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto Logout</Label>
              <p className="text-sm text-muted-foreground">
                Automatically log out after period of inactivity
              </p>
            </div>
            <Switch
              checked={securityPreferences?.autoLogout}
              onCheckedChange={(checked) =>
                updatePreferencesMutation.mutate({ autoLogout: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Single Session</Label>
              <p className="text-sm text-muted-foreground">
                Allow only one active session at a time
              </p>
            </div>
            <Switch
              checked={securityPreferences?.singleSession}
              onCheckedChange={(checked) =>
                updatePreferencesMutation.mutate({ singleSession: checked })
              }
            />
          </div>
          <Button variant="outline" className="w-full">
            View Active Sessions
          </Button>
        </CardContent>
      </Card>

      {/* Security Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Security Notifications
          </CardTitle>
          <CardDescription>
            Configure how you want to be notified about security events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Login Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified of new login attempts
              </p>
            </div>
            <Switch
              checked={securityPreferences?.loginAlerts}
              onCheckedChange={(checked) =>
                updatePreferencesMutation.mutate({ loginAlerts: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Security Updates</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications about security-related changes
              </p>
            </div>
            <Switch
              checked={securityPreferences?.securityUpdates}
              onCheckedChange={(checked) =>
                updatePreferencesMutation.mutate({ securityUpdates: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Security Activity Log
          </CardTitle>
          <CardDescription>
            Review recent security-related activities on your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activityLog.map((activity: any) => (
              <div
                key={activity.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div>
                  <p className="font-medium">{activity.action}</p>
                  <p className="text-sm text-muted-foreground">
                    {activity.location} • {activity.device}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {new Date(activity.timestamp).toLocaleDateString()}
                </p>
              </div>
            ))}
            {activityLog.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No recent activity
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}