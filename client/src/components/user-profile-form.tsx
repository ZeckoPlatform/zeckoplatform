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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";

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

const userProfileSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  country: z.enum(["GB", "US"], {
    required_error: "Please select a country",
  }),
  phoneNumber: z.string()
    .min(1, "Phone number is required")
    .refine((val) => {
      // Remove validation temporarily while typing
      if (val.length < 10) return true;
      const countryCode = val.startsWith('+1') ? 'US' : 'GB';
      return PHONE_COUNTRY_CODES[countryCode]?.pattern.test(val);
    }, {
      message: "Please enter a valid phone number"
    }),
});

type UserProfileFormData = z.infer<typeof userProfileSchema>;

export function UserProfileForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCountry, setSelectedCountry] = useState<"GB" | "US">(user?.countryCode as "GB" | "US" || "GB");

  const form = useForm<UserProfileFormData>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      email: user?.email || "",
      name: user?.name || "",
      country: user?.countryCode || "GB",
      phoneNumber: user?.phoneNumber || "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UserProfileFormData) => {
      const response = await apiRequest("POST", "/api/users/profile", data);
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
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const formatPhoneNumber = (value: string, country: "GB" | "US") => {
    // Remove all non-digits but keep the plus sign if it exists
    const digits = value.replace(/[^\d+]/g, "");

    // US Phone number formatting
    if (country === "US") {
      // If empty or just has plus, return as is
      if (digits.length <= 1) return digits;

      // If less than full number, just return the digits with +1 prefix
      if (digits.length < 11) {
        return digits.startsWith('+1') ? digits : `+1${digits}`;
      }

      // Format complete number
      const number = digits.startsWith('+1') ? digits.slice(2) : digits;
      return `+1 (${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6, 10)}`;
    }

    // UK Phone number formatting
    else {
      // If empty or just has plus, return as is
      if (digits.length <= 1) return digits;

      // If less than full number, just return the digits with +44 prefix
      if (digits.length < 11) {
        return digits.startsWith('+44') ? digits : `+44${digits}`;
      }

      // Format complete number
      const number = digits.startsWith('+44') ? digits.slice(3) : digits;
      return `+44 ${number.slice(0, 4)} ${number.slice(4, 10)}`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>
          Update your profile information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="country">Country</Label>
              <Select
                onValueChange={(value: "GB" | "US") => {
                  setSelectedCountry(value);
                  form.setValue("country", value);
                  form.setValue("phoneNumber", ""); // Reset phone number when country changes
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
                placeholder={PHONE_COUNTRY_CODES[selectedCountry]?.format}
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