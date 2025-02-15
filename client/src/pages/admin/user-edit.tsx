import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export default function UserEditPage() {
  const { user: currentUser } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Redirect if user is not a super admin
  if (!currentUser?.superAdmin) {
    setLocation("/");
    return null;
  }

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/users", id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/users/${id}`);
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (formData: any) => {
      const response = await apiRequest("PATCH", `/api/users/${id}`, formData);
      if (!response.ok) throw new Error("Failed to update user");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", id] });
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      setLocation("/admin-management");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/users/${id}`);
      if (!response.ok) throw new Error("Failed to delete user");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      setLocation("/admin-management");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>User not found</div>;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    updateUserMutation.mutate(data);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      deleteUserMutation.mutate();
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Edit User: {user.email}</CardTitle>
          <CardDescription>Update user information and settings</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={user.email}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                name="businessName"
                defaultValue={user.businessName || ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyNumber">Company Number</Label>
              <Input
                id="companyNumber"
                name="companyNumber"
                defaultValue={user.companyNumber || ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vatNumber">VAT Number</Label>
              <Input
                id="vatNumber"
                name="vatNumber"
                defaultValue={user.vatNumber || ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="utrNumber">UTR Number</Label>
              <Input
                id="utrNumber"
                name="utrNumber"
                defaultValue={user.utrNumber || ""}
              />
            </div>

            <div className="flex justify-between space-x-4 pt-4">
              <div>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteUserMutation.isPending}
                >
                  {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
                </Button>
              </div>
              <div className="flex space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/admin-management")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateUserMutation.isPending}
                >
                  {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}