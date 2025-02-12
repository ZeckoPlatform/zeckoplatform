import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";
import { getSubscriptionStatus, cancelSubscription } from "@/lib/subscription";

const businessProfileSchema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  categories: z.string(),
  location: z.string().min(2, "Location must be at least 2 characters"),
  budget: z.string(),
  industries: z.string(),
});

type BusinessProfileFormData = z.infer<typeof businessProfileSchema>;

export default function BusinessProfilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Get current subscription status
  const { data: subscription } = useQuery({
    queryKey: ["/api/subscriptions/current"],
    queryFn: getSubscriptionStatus,
  });

  // Subscription cancellation mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/current"] });
      toast({
        title: "Success",
        description: "Your subscription has been cancelled successfully.",
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

  // Redirect if user is not a business or vendor
  if (!user || (user.userType !== 'business' && user.userType !== 'vendor')) {
    setLocation("/");
    return null;
  }

  const { register, handleSubmit, formState: { errors } } = useForm<BusinessProfileFormData>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: {
      name: user?.profile?.name || "",
      description: user?.profile?.description || "",
      categories: user?.profile?.categories?.join(", ") || "",
      location: user?.profile?.location || "",
      budget: user?.profile?.matchPreferences?.budgetRange?.min?.toString() || "",
      industries: user?.profile?.matchPreferences?.industries?.join(", ") || "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: BusinessProfileFormData) => {
      const response = await apiRequest("POST", "/api/users/profile", {
        ...data,
        categories: data.categories.split(",").map(c => c.trim()),
        industries: data.industries.split(",").map(i => i.trim()),
        matchPreferences: {
          budgetRange: {
            min: parseInt(data.budget),
            max: parseInt(data.budget) * 2, // This is just an example, adjust as needed
          },
          industries: data.industries.split(",").map(i => i.trim()),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Success",
        description: "Your business profile has been updated.",
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
        <h1 className="text-3xl font-bold">Business Profile</h1>
        <Button variant="outline" onClick={() => setLocation("/settings")}>
          Back to Settings
        </Button>
      </div>

      {subscription?.active && (
        <Card>
          <CardHeader>
            <CardTitle>Subscription Status</CardTitle>
            <CardDescription>
              Manage your current subscription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="font-medium">Current Plan: {subscription.tier}</p>
                <p className="text-sm text-muted-foreground">
                  {subscription.endDate ? `Renews on ${new Date(subscription.endDate).toLocaleDateString()}` : 'No renewal date'}
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => {
                  if (window.confirm('Are you sure you want to cancel your subscription? This will take effect at the end of your current billing period.')) {
                    cancelSubscriptionMutation.mutate();
                  }
                }}
                disabled={cancelSubscriptionMutation.isPending}
              >
                {cancelSubscriptionMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Cancel Subscription'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your business profile to help us match you with relevant leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Business Name</Label>
              <Input
                id="name"
                {...register("name")}
                error={errors.name?.message}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Business Description</Label>
              <Textarea
                id="description"
                {...register("description")}
                error={errors.description?.message}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="categories">Categories (comma-separated)</Label>
              <Input
                id="categories"
                {...register("categories")}
                placeholder="e.g. IT Services, Consulting, Marketing"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                {...register("location")}
                error={errors.location?.message}
              />
              {errors.location && (
                <p className="text-sm text-destructive">{errors.location.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">Minimum Budget (£)</Label>
              <Input
                id="budget"
                type="number"
                {...register("budget")}
                placeholder="e.g. 1000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industries">Target Industries (comma-separated)</Label>
              <Input
                id="industries"
                {...register("industries")}
                placeholder="e.g. Technology, Healthcare, Finance"
              />
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