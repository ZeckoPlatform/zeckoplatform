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
import { Shield, UserX, FileText, Archive } from "lucide-react";

export default function AdminManagementPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Redirect if user is not a super admin
  if (!user?.superAdmin) {
    setLocation("/");
    return null;
  }

  const { data: admins = [] } = useQuery({
    queryKey: ["/api/admins"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admins");
      if (!response.ok) throw new Error("Failed to fetch admins");
      return response.json();
    },
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["/api/documents"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/documents");
      if (!response.ok) throw new Error("Failed to fetch documents");
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

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Management</h1>
        <p className="text-sm text-muted-foreground">Super Admin Only</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Admins</CardTitle>
          <CardDescription>
            Manage administrator access for users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {admins.map((admin: any) => (
              <div
                key={admin.id}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div>
                  <h3 className="font-semibold">{admin.username}</h3>
                  <p className="text-sm text-muted-foreground">{admin.email}</p>
                </div>
                {!admin.superAdmin && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => revokeAdminMutation.mutate(admin.id)}
                    disabled={revokeAdminMutation.isPending}
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    Revoke Admin
                  </Button>
                )}
                {admin.superAdmin && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Shield className="w-4 h-4 mr-2" />
                    Super Admin
                  </div>
                )}
              </div>
            ))}

            {admins.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No administrators found
              </p>
            )}
          </div>
        </CardContent>
      </Card>

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
                    <Shield className="w-4 h-4 mr-2" />
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
    </div>
  );
}