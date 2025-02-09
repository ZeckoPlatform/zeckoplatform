import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Shield, UserX, FileText, Archive, Users, Settings, BarChart4, Lock, KeyRound } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";


export default function AdminManagementPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Redirect if user is not a super admin
  if (!user?.superAdmin) {
    setLocation("/");
    return null;
  }

  // Fetch all users for user management
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  // Fetch current admins
  const { data: admins = [] } = useQuery({
    queryKey: ["/api/admins"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admins");
      if (!response.ok) throw new Error("Failed to fetch admins");
      return response.json();
    },
  });

  // Fetch documents for document management
  const { data: documents = [] } = useQuery({
    queryKey: ["/api/documents"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/documents");
      if (!response.ok) throw new Error("Failed to fetch documents");
      return response.json();
    },
  });

  // Fetch application statistics
  const { data: stats = {} } = useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/stats");
      if (!response.ok) throw new Error("Failed to fetch statistics");
      return response.json();
    },
  });

  const grantAdminMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("POST", `/api/admins/${userId}`);
      if (!response.ok) throw new Error("Failed to grant admin access");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admins"] });
      toast({
        title: "Success",
        description: "Admin access granted successfully",
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

  const revokeAdminMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("DELETE", `/api/admins/${userId}`);
      if (!response.ok) throw new Error("Failed to revoke admin access");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admins"] });
      toast({
        title: "Success",
        description: "Admin access revoked successfully",
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

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/reset-password`);
      if (!response.ok) throw new Error("Failed to reset password");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Password Reset Successfully",
        description: `New temporary password: ${data.temporaryPassword}`,
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

  // New mutations for subscription management
  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ userId, subscriptionType }: { userId: number; subscriptionType: string }) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/subscription`, {
        subscriptionType,
      });
      if (!response.ok) throw new Error("Failed to update subscription");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "Subscription updated successfully",
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

  const sendMassEmailMutation = useMutation({
    mutationFn: async (data: { subject: string; message: string }) => {
      const response = await apiRequest("POST", "/api/admin/mass-email", data);
      if (!response.ok) throw new Error("Failed to send mass email");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Mass email sent successfully",
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


  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Super Admin Controls</p>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{stats.totalRevenue || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscriptions || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* User Management */}
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage all user accounts and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.userType}</TableCell>
                  <TableCell>
                    {user.superAdmin && <Shield className="w-4 h-4 text-primary inline mr-1" />}
                    {user.userType}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation(`/admin/users/${user.id}`)}
                      >
                        Edit
                      </Button>
                      {/* Reset Password Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to reset the password for ${user.username}?`)) {
                            resetPasswordMutation.mutate(user.id);
                          }
                        }}
                      >
                        <KeyRound className="w-4 h-4 mr-2" />
                        Reset Password
                      </Button>
                      {/* Subscription Management */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            Change Subscription
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => updateSubscriptionMutation.mutate({
                              userId: user.id,
                              subscriptionType: "free",
                            })}
                          >
                            Set to Free
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => updateSubscriptionMutation.mutate({
                              userId: user.id,
                              subscriptionType: "business",
                            })}
                          >
                            Set to Business
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => updateSubscriptionMutation.mutate({
                              userId: user.id,
                              subscriptionType: "vendor",
                            })}
                          >
                            Set to Vendor
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {!user.superAdmin && user.userType !== "admin" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => grantAdminMutation.mutate(user.id)}
                        >
                          Make Admin
                        </Button>
                      )}
                      {user.userType === "admin" && !user.superAdmin && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => revokeAdminMutation.mutate(user.id)}
                        >
                          Revoke Admin
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Document Management */}
      <Card>
        <CardHeader>
          <CardTitle>Document Management</CardTitle>
          <CardDescription>
            Manage document access and permissions across the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {documents.map((doc: any) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div className="flex items-center space-x-4">
                  <FileText className="w-6 h-6 text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold">{doc.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Owner: {doc.owner?.username}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation(`/documents/${doc.id}`)}
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    View Versions
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation(`/documents/${doc.id}/access`)}
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Manage Access
                  </Button>
                </div>
              </div>
            ))}

            {documents.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No documents found
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mass Email */}
      <Card>
        <CardHeader>
          <CardTitle>Mass Communication</CardTitle>
          <CardDescription>
            Send emails to all registered users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const data = {
                subject: formData.get("subject") as string,
                message: formData.get("message") as string,
              };
              sendMassEmailMutation.mutate(data);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="subject">Email Subject</Label>
              <Input
                id="subject"
                name="subject"
                placeholder="Enter email subject"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Email Message</Label>
              <Textarea
                id="message"
                name="message"
                placeholder="Enter your message"
                className="min-h-[200px]"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={sendMassEmailMutation.isPending}
            >
              {sendMassEmailMutation.isPending ? (
                <>Sending...</>
              ) : (
                <>Send Mass Email</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* System Settings */}
      <Card>
        <CardHeader>
          <CardTitle>System Settings</CardTitle>
          <CardDescription>
            Configure global application settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button
              variant="outline"
              onClick={() => setLocation('/admin/settings/security')}
            >
              <Lock className="w-4 h-4 mr-2" />
              Security Settings
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation('/admin/settings/notifications')}
            >
              <Settings className="w-4 h-4 mr-2" />
              Notification Settings
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation('/admin/settings/analytics')}
            >
              <BarChart4 className="w-4 h-4 mr-2" />
              Analytics Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}