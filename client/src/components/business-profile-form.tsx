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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

const COUNTRIES = {
  GB: "United Kingdom",
  US: "United States",
  // Add more countries as needed
};

const businessProfileSchema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  categories: z.string().min(1, "Please enter at least one category"),
  country: z.string().min(2, "Please select a country"),
  address: z.object({
    street: z.string().min(1, "Street address is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State/Province is required"),
    postalCode: z.string().min(1, "Postal code is required"),
  }),
  registrationNumber: z.string().min(1, "Business registration number is required"),
  taxNumber: z.string().optional(),
  budget: z.string(),
  industries: z.string(),
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
      country: user?.profile?.country || "GB",
      address: {
        street: user?.profile?.address?.street || "",
        city: user?.profile?.address?.city || "",
        state: user?.profile?.address?.state || "",
        postalCode: user?.profile?.address?.postalCode || "",
      },
      registrationNumber: user?.businessDetails?.registrationNumber || "",
      taxNumber: user?.businessDetails?.taxNumber || "",
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
        address: {
          ...data.address,
          country: data.country,
        },
        businessDetails: {
          registrationNumber: data.registrationNumber,
          registrationType: data.country === "GB" ? "companiesHouse" : "ein",
          taxNumber: data.taxNumber,
          taxNumberType: data.country === "GB" ? "vat" : "ein",
          country: data.country,
        },
        matchPreferences: {
          budgetRange: {
            min: parseInt(data.budget),
            max: parseInt(data.budget) * 2,
          },
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
        <form onSubmit={form.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Business Name</Label>
            <Input
              id="name"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Business Description</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              className="min-h-[100px]"
            />
            {form.formState.errors.description && (
              <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Select
              onValueChange={(value) => form.setValue("country", value)}
              defaultValue={form.getValues("country")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your country" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(COUNTRIES).map(([code, name]) => (
                  <SelectItem key={code} value={code}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address.street">Street Address</Label>
            <Input
              id="address.street"
              {...form.register("address.street")}
            />
            {form.formState.errors.address?.street && (
              <p className="text-sm text-destructive">{form.formState.errors.address.street.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address.city">City</Label>
              <Input
                id="address.city"
                {...form.register("address.city")}
              />
              {form.formState.errors.address?.city && (
                <p className="text-sm text-destructive">{form.formState.errors.address.city.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address.state">
                {form.watch("country") === "GB" ? "County" : "State"}
              </Label>
              <Input
                id="address.state"
                {...form.register("address.state")}
              />
              {form.formState.errors.address?.state && (
                <p className="text-sm text-destructive">{form.formState.errors.address.state.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address.postalCode">
              {form.watch("country") === "GB" ? "Postcode" : "ZIP Code"}
            </Label>
            <Input
              id="address.postalCode"
              {...form.register("address.postalCode")}
            />
            {form.formState.errors.address?.postalCode && (
              <p className="text-sm text-destructive">{form.formState.errors.address.postalCode.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="registrationNumber">
              {form.watch("country") === "GB" ? "Companies House Number" : "EIN"}
            </Label>
            <Input
              id="registrationNumber"
              {...form.register("registrationNumber")}
            />
            {form.formState.errors.registrationNumber && (
              <p className="text-sm text-destructive">{form.formState.errors.registrationNumber.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="taxNumber">
              {form.watch("country") === "GB" ? "VAT Number" : "Tax ID (Optional)"}
            </Label>
            <Input
              id="taxNumber"
              {...form.register("taxNumber")}
            />
            {form.formState.errors.taxNumber && (
              <p className="text-sm text-destructive">{form.formState.errors.taxNumber.message}</p>
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