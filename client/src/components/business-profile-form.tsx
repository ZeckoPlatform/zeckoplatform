import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

const businessProfileSchema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  categories: z.string().min(1, "Please enter at least one category"),
  location: z.string().min(2, "Location is required"),
  budget: z.string().min(1, "Budget range is required"),
  industries: z.string().min(1, "Please enter at least one industry"),
});

type BusinessProfileFormData = z.infer<typeof businessProfileSchema>;

export function BusinessProfileForm() {
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<BusinessProfileFormData>({
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
        budget: parseInt(data.budget),
      });
      if (!response.ok) {
        throw new Error("Failed to update profile");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch user data and leads
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
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Profile</CardTitle>
        <CardDescription>
          Complete your business profile to get matched with relevant leads.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={form.handleSubmit((data) => updateProfileMutation.mutate(data))}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="name">Business Name</Label>
            <Input
              id="name"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Business Description</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              className="min-h-[100px]"
            />
            {form.formState.errors.description && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="categories">Service Categories</Label>
            <Input
              id="categories"
              {...form.register("categories")}
              placeholder="e.g. Web Development, Marketing, Design (comma-separated)"
            />
            {form.formState.errors.categories && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.categories.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              {...form.register("location")}
              placeholder="e.g. London, Manchester"
            />
            {form.formState.errors.location && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.location.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="budget">Average Project Budget (£)</Label>
            <Input
              id="budget"
              type="number"
              {...form.register("budget")}
              placeholder="e.g. 5000"
            />
            {form.formState.errors.budget && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.budget.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="industries">Industries</Label>
            <Input
              id="industries"
              {...form.register("industries")}
              placeholder="e.g. Technology, Healthcare, Retail (comma-separated)"
            />
            {form.formState.errors.industries && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.industries.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={updateProfileMutation.isPending}
          >
            {updateProfileMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Profile'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}