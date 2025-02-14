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
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft } from "lucide-react";
import { BUSINESS_CATEGORIES } from "../leads-page";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

// Phone number formatting configuration
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

const COUNTRIES = {
  GB: "United Kingdom",
  US: "United States"
};

const businessProfileSchema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Please select a category"),
  subcategory: z.string().min(1, "Please select a subcategory"),
  location: z.string().min(2, "Location must be at least 2 characters"),
  country: z.enum(["GB", "US"]),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  budget: z.string(),
  industries: z.string(),
});

type BusinessProfileFormData = z.infer<typeof businessProfileSchema>;

export default function BusinessProfilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>(user?.profile?.categories?.[0] || "");
  const [selectedCountry, setSelectedCountry] = useState<"GB" | "US">(user?.countryCode as "GB" | "US" || "GB");

  // Redirect if user is not a business or vendor
  if (!user || (user.userType !== 'business' && user.userType !== 'vendor')) {
    setLocation("/");
    return null;
  }

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

  const { register, handleSubmit, formState: { errors }, setValue, getValues, form } = useForm<BusinessProfileFormData>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: {
      name: user?.profile?.name || "",
      description: user?.profile?.description || "",
      category: user?.profile?.categories?.[0] || "",
      subcategory: user?.profile?.categories?.[1] || "",
      location: user?.profile?.location || "",
      country: user?.countryCode as "GB" | "US" || "GB",
      phoneNumber: user?.profile?.phoneNumber || "",
      budget: user?.profile?.matchPreferences?.budgetRange?.min?.toString() || "",
      industries: user?.profile?.matchPreferences?.industries?.join(", ") || "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: BusinessProfileFormData) => {
      const response = await apiRequest("PATCH", "/api/user/profile", {
        profile: {
          ...data,
          categories: [data.category, data.subcategory],
          industries: data.industries.split(",").map(i => i.trim()),
          matchPreferences: {
            budgetRange: {
              min: parseInt(data.budget),
              max: parseInt(data.budget) * 2,
            },
            industries: data.industries.split(",").map(i => i.trim()),
          },
        }
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
        <Button variant="ghost" onClick={() => window.history.back()}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your {user?.userType === 'business' ? 'business' : 'vendor'} profile to help us match you with relevant opportunities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Business Name</Label>
              <Input
                id="name"
                {...register("name")}
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
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="category">Main Category</Label>
                <Select
                  onValueChange={(value) => {
                    setSelectedCategory(value);
                    setValue("category", value);
                    setValue("subcategory", ""); // Reset subcategory when main category changes
                  }}
                  defaultValue={getValues("category")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a main category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(BUSINESS_CATEGORIES).map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-sm text-destructive">{errors.category.message}</p>
                )}
              </div>

              {selectedCategory && (
                <div>
                  <Label htmlFor="subcategory">Subcategory</Label>
                  <Select
                    onValueChange={(value) => setValue("subcategory", value)}
                    defaultValue={getValues("subcategory")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_CATEGORIES[selectedCategory as keyof typeof BUSINESS_CATEGORIES].map((subcategory) => (
                        <SelectItem key={subcategory} value={subcategory}>
                          {subcategory}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.subcategory && (
                    <p className="text-sm text-destructive">{errors.subcategory.message}</p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                {...register("location")}
              />
              {errors.location && (
                <p className="text-sm text-destructive">{errors.location.message}</p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="country">Country</Label>
                <Select
                  onValueChange={(value: "GB" | "US") => {
                    setSelectedCountry(value);
                    setValue("country", value);
                    setValue("phoneNumber", ""); // Reset phone number when country changes
                  }}
                  defaultValue={selectedCountry}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
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
                  {...register("phoneNumber")}
                  placeholder={PHONE_COUNTRY_CODES[selectedCountry].format}
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value, selectedCountry);
                    form.setValue("phoneNumber", formatted);
                  }}
                />
                {errors.phoneNumber && (
                  <p className="text-sm text-destructive">{errors.phoneNumber.message}</p>
                )}
              </div>
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