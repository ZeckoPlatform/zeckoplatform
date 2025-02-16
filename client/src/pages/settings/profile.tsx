import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Bell } from "lucide-react";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  bio: z.string().optional(),
  email: z.string().email("Please enter a valid email address"),
  notificationsEnabled: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  profileVisibility: z.enum(["public", "private"]).default("public"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Redirect business/vendor users to their specific profile page
  if (user?.userType === 'business' || user?.userType === 'vendor') {
    setLocation("/settings/business-profile");
    return null;
  }

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.profile?.name || "",
      bio: user?.profile?.bio || "",
      email: user?.email || "",
      notificationsEnabled: user?.profile?.notifications?.enabled || false,
      marketingEmails: user?.profile?.notifications?.marketing || false,
      profileVisibility: user?.profile?.visibility || "public",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await apiRequest("POST", "/api/users/profile", {
        ...data,
        type: "free",
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Success",
        description: "Your profile has been updated.",
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
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <Button variant="outline" onClick={() => setLocation("/settings")}>
          Back to Settings
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
          <CardDescription>
            Manage your basic profile information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                {...register("bio")}
                placeholder="Tell us a bit about yourself"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-4">
              <Label>Profile Visibility</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="profileVisibility"
                  {...register("profileVisibility")}
                  checked={watch("profileVisibility") === "public"}
                  onCheckedChange={(checked) =>
                    setValue("profileVisibility", checked ? "public" : "private")
                  }
                />
                <Label htmlFor="profileVisibility">Make profile public</Label>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="notificationsEnabled"
                    {...register("notificationsEnabled")}
                  />
                  <Label htmlFor="notificationsEnabled">Enable notifications</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="marketingEmails"
                    {...register("marketingEmails")}
                  />
                  <Label htmlFor="marketingEmails">Receive marketing emails</Label>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Profile...
                </>
              ) : (
                "Save Profile"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}