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
  // UK-specific fields
  companyNumber: z.string().optional()
    .refine(val => !val || /^[A-Z0-9]{8}$/.test(val), {
      message: "Invalid Companies House number format"
    }),
  vatNumber: z.string().optional()
    .refine(val => !val || /^GB[0-9]{9}$/.test(val), {
      message: "Invalid UK VAT number format"
    }),
  // US-specific fields
  einNumber: z.string().optional()
    .refine(val => !val || /^\d{2}-\d{7}$/.test(val), {
      message: "Invalid EIN format (XX-XXXXXXX)"
    }),
  stateRegistrationNumber: z.string().optional(),
  registeredState: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.country === 'GB' && !data.companyNumber) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Companies House number is required for UK businesses",
      path: ["companyNumber"]
    });
  }
  if (data.country === 'US' && !data.einNumber) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "EIN is required for US businesses",
      path: ["einNumber"]
    });
  }
  if (data.country === 'US' && !data.registeredState) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "State registration is required for US businesses",
      path: ["registeredState"]
    });
  }
});

type BusinessProfileFormData = z.infer<typeof businessProfileSchema>;

export function BusinessProfileForm() {
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<BusinessProfileFormData>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: {
      name: user?.businessName || "",
      description: user?.profile?.description || "",
      categories: user?.profile?.categories?.join(", ") || "",
      country: user?.countryCode || "GB",
      address: {
        street: user?.profile?.address?.street || "",
        city: user?.profile?.address?.city || "",
        state: user?.profile?.address?.state || "",
        postalCode: user?.profile?.address?.postalCode || "",
      },
      companyNumber: user?.companyNumber || "",
      vatNumber: user?.vatNumber || "",
      einNumber: user?.einNumber || "",
      stateRegistrationNumber: user?.stateRegistrationNumber || "",
      registeredState: user?.registeredState || "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: BusinessProfileFormData) => {
      const response = await apiRequest("POST", "/api/users/profile", {
        ...data,
        categories: data.categories.split(",").map(c => c.trim()),
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

  const selectedCountry = form.watch("country");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Profile</CardTitle>
        <CardDescription>
          Complete your business profile for {selectedCountry === 'GB' ? 'UK' : 'US'} registration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-4">
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

          {/* Country-specific registration fields */}
          {selectedCountry === 'GB' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="companyNumber">Companies House Number</Label>
                <Input
                  id="companyNumber"
                  {...form.register("companyNumber")}
                />
                {form.formState.errors.companyNumber && (
                  <p className="text-sm text-destructive">{form.formState.errors.companyNumber.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="vatNumber">VAT Number (Optional)</Label>
                <Input
                  id="vatNumber"
                  {...form.register("vatNumber")}
                />
                {form.formState.errors.vatNumber && (
                  <p className="text-sm text-destructive">{form.formState.errors.vatNumber.message}</p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="einNumber">EIN (Tax ID)</Label>
                <Input
                  id="einNumber"
                  {...form.register("einNumber")}
                  placeholder="XX-XXXXXXX"
                />
                {form.formState.errors.einNumber && (
                  <p className="text-sm text-destructive">{form.formState.errors.einNumber.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="registeredState">Registered State</Label>
                <Input
                  id="registeredState"
                  {...form.register("registeredState")}
                />
                {form.formState.errors.registeredState && (
                  <p className="text-sm text-destructive">{form.formState.errors.registeredState.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="stateRegistrationNumber">State Registration Number</Label>
                <Input
                  id="stateRegistrationNumber"
                  {...form.register("stateRegistrationNumber")}
                />
                {form.formState.errors.stateRegistrationNumber && (
                  <p className="text-sm text-destructive">{form.formState.errors.stateRegistrationNumber.message}</p>
                )}
              </div>
            </>
          )}

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
                {selectedCountry === 'GB' ? 'County' : 'State'}
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
              {selectedCountry === 'GB' ? 'Postcode' : 'ZIP Code'}
            </Label>
            <Input
              id="address.postalCode"
              {...form.register("address.postalCode")}
            />
            {form.formState.errors.address?.postalCode && (
              <p className="text-sm text-destructive">{form.formState.errors.address.postalCode.message}</p>
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