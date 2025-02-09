import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Bell, Mail, MessageSquare } from "lucide-react";

export default function NotificationSettingsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect if user is not a super admin
  if (!user?.superAdmin) {
    setLocation("/");
    return null;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Notification Settings</h1>
        <Button variant="outline" onClick={() => setLocation("/admin-management")}>
          Back to Dashboard
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>Configure system-wide email notification settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-center space-x-4">
              <Label>Send Welcome Emails</Label>
              <Input type="checkbox" defaultChecked />
            </div>
            <div className="flex items-center space-x-4">
              <Label>Send Password Reset Notifications</Label>
              <Input type="checkbox" defaultChecked />
            </div>
            <div className="space-y-2">
              <Label>Email Footer Text</Label>
              <Textarea defaultValue="This email was sent by Zecko. Please do not reply to this email." />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Notifications</CardTitle>
          <CardDescription>Configure in-app notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-center space-x-4">
              <Label>New User Registrations</Label>
              <Input type="checkbox" defaultChecked />
            </div>
            <div className="flex items-center space-x-4">
              <Label>Failed Login Attempts</Label>
              <Input type="checkbox" defaultChecked />
            </div>
            <div className="flex items-center space-x-4">
              <Label>Subscription Changes</Label>
              <Input type="checkbox" defaultChecked />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Templates</CardTitle>
          <CardDescription>Customize notification message templates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Welcome Message Template</Label>
              <Textarea defaultValue="Welcome to Zecko! We're excited to have you on board." />
            </div>
            <div className="space-y-2">
              <Label>Password Reset Template</Label>
              <Textarea defaultValue="Your password has been reset. If you did not request this change, please contact support immediately." />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
