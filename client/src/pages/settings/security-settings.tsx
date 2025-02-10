import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Shield, Key, Lock } from "lucide-react";
import { useEffect } from "react";

export default function SecuritySettingsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect if user is not a super admin
    if (!user?.superAdmin) {
      setLocation("/");
    }
  }, [user, setLocation]);

  // If user is not super admin, don't render anything
  if (!user?.superAdmin) {
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

      <Card>
        <CardHeader>
          <CardTitle>Password Policy</CardTitle>
          <CardDescription>Configure password requirements for all users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-center space-x-4">
              <Label>Minimum Password Length</Label>
              <Input type="number" defaultValue={8} min={8} max={32} />
            </div>
            <div className="flex items-center space-x-4">
              <Label>Require Special Characters</Label>
              <Input type="checkbox" defaultChecked />
            </div>
            <div className="flex items-center space-x-4">
              <Label>Password Expiry (days)</Label>
              <Input type="number" defaultValue={90} min={30} max={365} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>Configure 2FA settings for user accounts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-center space-x-4">
              <Label>Require 2FA for Admin Accounts</Label>
              <Input type="checkbox" defaultChecked />
            </div>
            <div className="flex items-center space-x-4">
              <Label>Allow Email-based 2FA</Label>
              <Input type="checkbox" defaultChecked />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session Management</CardTitle>
          <CardDescription>Configure session timeout and security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-center space-x-4">
              <Label>Session Timeout (minutes)</Label>
              <Input type="number" defaultValue={30} min={15} max={120} />
            </div>
            <div className="flex items-center space-x-4">
              <Label>Max Login Attempts</Label>
              <Input type="number" defaultValue={5} min={3} max={10} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}