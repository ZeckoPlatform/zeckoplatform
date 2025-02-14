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

const PHONE_COUNTRY_CODES = {
  GB: {
    code: "44",
    format: "+44 XXXX XXXXXX",
    pattern: /^\+44\s\d{4}\s\d{6}$/
  },
  US: {
    code: "1",
    format: "+1 (XXX) XXX-XXXX",
    pattern: /^\+1\s\(\d{3}\)\s\d{3}-\d{4}$/
  }
};

const US_STATES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia"
};

const businessProfileSchema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  categories: z.string().min(1, "Please enter at least one category"),
  country: z.enum(["GB", "US"], {
    required_error: "Please select a country",
  }),
  phoneNumber: z.string().min(1, "Phone number is required"),
  address: z.object({
    street: z.string().min(1, "Street address is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State/Province is required"),
    postalCode: z.string().min(1, "Postal code is required"),
  }),
  companyNumber: z.string().optional(),
  vatNumber: z.string().optional(),
  einNumber: z.string().optional(),
  registeredState: z.string().optional(),
  stateRegistrationNumber: z.string().optional(),
}).superRefine((data, ctx) => {
  // Phone number validation
  const phonePattern = PHONE_COUNTRY_CODES[data.country].pattern;
  if (!phonePattern.test(data.phoneNumber)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please enter a valid phone number",
      path: ["phoneNumber"]
    });
  }

  // Country specific validations
  if (data.country === 'GB') {
    if (!data.companyNumber || !/^[A-Z0-9]{8}$/.test(data.companyNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter a valid 8-character Companies House number",
        path: ["companyNumber"]
      });
    }
    if (data.vatNumber && !/^GB[0-9]{9}$/.test(data.vatNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter a valid UK VAT number",
        path: ["vatNumber"]
      });
    }
  }

  if (data.country === 'US') {
    if (!data.einNumber || !/^\d{2}-\d{7}$/.test(data.einNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter a valid EIN (XX-XXXXXXX)",
        path: ["einNumber"]
      });
    }
    if (!data.registeredState) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select a registered state",
        path: ["registeredState"]
      });
    }
    if (data.address.postalCode && !/^\d{5}(-\d{4})?$/.test(data.address.postalCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid ZIP code format (XXXXX or XXXXX-XXXX)",
        path: ["address", "postalCode"]
      });
    }
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
      phoneNumber: user?.phoneNumber || "",
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

  const formatPhoneNumber = (value: string, country: "GB" | "US") => {
    const digits = value.replace(/\D/g, "");

    if (country === "US") {
      if (digits.length <= 3) return `+1 (${digits}`;
      if (digits.length <= 6) return `+1 (${digits.slice(0, 3)}) ${digits.slice(3)}`;
      return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    } else {
      if (digits.length <= 4) return `+44 ${digits}`;
      return `+44 ${digits.slice(0, 4)} ${digits.slice(4, 10)}`;
    }
  };

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
              onValueChange={(value: "GB" | "US") => {
                form.setValue("country", value);
                form.setValue("phoneNumber", "");
              }}
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
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              {...form.register("phoneNumber")}
              placeholder={PHONE_COUNTRY_CODES[selectedCountry].format}
              onChange={(e) => {
                const formatted = formatPhoneNumber(e.target.value, selectedCountry);
                form.setValue("phoneNumber", formatted);
              }}
            />
            {form.formState.errors.phoneNumber && (
              <p className="text-sm text-destructive">
                {form.formState.errors.phoneNumber.message}
              </p>
            )}
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

          {selectedCountry === 'GB' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="companyNumber">Companies House Number</Label>
                <Input
                  id="companyNumber"
                  {...form.register("companyNumber")}
                  placeholder="12345678"
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
                  placeholder="GB123456789"
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
                <Select
                  onValueChange={(value) => form.setValue("registeredState", value)}
                  defaultValue={form.getValues("registeredState")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your state" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(US_STATES).map(([code, name]) => (
                      <SelectItem key={code} value={code}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.registeredState && (
                  <p className="text-sm text-destructive">{form.formState.errors.registeredState.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="stateRegistrationNumber">State Registration Number (Optional)</Label>
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
              {selectedCountry === 'US' ? (
                <Select
                  onValueChange={(value) => form.setValue("address.state", value)}
                  defaultValue={form.getValues("address.state")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your state" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(US_STATES).map(([code, name]) => (
                      <SelectItem key={code} value={code}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="address.state"
                  {...form.register("address.state")}
                />
              )}
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