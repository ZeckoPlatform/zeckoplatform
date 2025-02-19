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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { ErrorBoundary } from "./ErrorBoundary";

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
  bio: z.string().optional(),
  country: z.enum(["GB", "US"], {
    required_error: "Please select a country",
  }),
  phoneNumber: z.string()
    .min(1, "Phone number is required")
    .refine((val) => {
      const countryCode = val.startsWith('+1') ? 'US' : 'GB';
      return PHONE_COUNTRY_CODES[countryCode].pattern.test(val);
    }, "Please enter a valid phone number"),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal('')),
  address: z.string().optional(),
  professionalTitle: z.string().optional(),
  skills: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  timezone: z.string().optional(),
  socialLinks: z.object({
    linkedin: z.string().url("Please enter a valid LinkedIn URL").optional().or(z.literal('')),
    twitter: z.string().url("Please enter a valid Twitter URL").optional().or(z.literal('')),
    facebook: z.string().url("Please enter a valid Facebook URL").optional().or(z.literal('')),
  }).optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
    marketing: z.boolean().optional(),
  }).optional(),
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type UserProfileFormData = z.infer<typeof userProfileSchema>;
type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

export function UserProfileForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCountry, setSelectedCountry] = useState<"GB" | "US">(user?.countryCode as "GB" | "US" || "GB");

  const profileForm = useForm<UserProfileFormData>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      email: user?.email || "",
      name: user?.profile?.name || "",
      bio: user?.profile?.bio || "",
      country: user?.countryCode || "GB",
      phoneNumber: user?.profile?.phoneNumber || "",
      company: user?.profile?.company || "",
      jobTitle: user?.profile?.jobTitle || "",
      website: user?.profile?.website || "",
      address: user?.profile?.address || "",
      professionalTitle: user?.profile?.professionalTitle || "",
      skills: user?.profile?.skills || [],
      languages: user?.profile?.languages || [],
      timezone: user?.profile?.timezone || "",
      socialLinks: {
        linkedin: user?.profile?.socialLinks?.linkedin || "",
        twitter: user?.profile?.socialLinks?.twitter || "",
        facebook: user?.profile?.socialLinks?.facebook || "",
      },
      notifications: {
        email: user?.profile?.notifications?.email || true,
        sms: user?.profile?.notifications?.sms || false,
        marketing: user?.profile?.notifications?.marketing || false,
      },
    },
  });

  const passwordForm = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
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

  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordChangeFormData) => {
      const response = await apiRequest("POST", "/api/users/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      if (!response.ok) {
        throw new Error("Failed to change password");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Your password has been updated.",
      });
      passwordForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  const formatPhoneNumber = (value: string, country: "GB" | "US") => {
    let cleaned = value.replace(/[^\d+]/g, "");

    if (country === "US") {
      if (cleaned.length <= 3) {
        return `+1 (${cleaned}`;
      } else if (cleaned.length <= 6) {
        return `+1 (${cleaned.slice(0,3)}) ${cleaned.slice(3)}`;
      }
      return `+1 (${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6,10)}`;
    } else {
      if (cleaned.length <= 4) {
        return `+44 ${cleaned}`;
      } else if (cleaned.length <= 7) {
        return `+44 ${cleaned.slice(0,4)} ${cleaned.slice(4)}`;
      }
      return `+44 ${cleaned.slice(0,4)} ${cleaned.slice(4,10)}`;
    }
  };

  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList>
        <TabsTrigger value="profile">Profile Information</TabsTrigger>
        <TabsTrigger value="preferences">Preferences</TabsTrigger>
        <TabsTrigger value="security">Security Settings</TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>
              Update your profile information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...profileForm.register("email")}
                  />
                  {profileForm.formState.errors.email?.message && (
                    <p className="text-sm text-destructive">{profileForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    {...profileForm.register("name")}
                  />
                  {profileForm.formState.errors.name?.message && (
                    <p className="text-sm text-destructive">{profileForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    {...profileForm.register("bio")}
                    placeholder="Tell us about yourself"
                  />
                </div>
              </div>

              {/* Professional Information */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="professionalTitle">Professional Title</Label>
                    <Input
                      id="professionalTitle"
                      {...profileForm.register("professionalTitle")}
                      placeholder="e.g. Senior Developer"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      {...profileForm.register("company")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    {...profileForm.register("website")}
                    placeholder="https://"
                  />
                  {profileForm.formState.errors.website?.message && (
                    <p className="text-sm text-destructive">{profileForm.formState.errors.website.message}</p>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Select
                    onValueChange={(value: "GB" | "US") => {
                      setSelectedCountry(value);
                      profileForm.setValue("country", value);
                      profileForm.setValue("phoneNumber", "");
                    }}
                    defaultValue={profileForm.getValues("country")}
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
                    {...profileForm.register("phoneNumber")}
                    placeholder={PHONE_COUNTRY_CODES[selectedCountry].format}
                    onChange={(e) => {
                      const formatted = formatPhoneNumber(e.target.value, selectedCountry);
                      profileForm.setValue("phoneNumber", formatted);
                    }}
                  />
                  {profileForm.formState.errors.phoneNumber?.message && (
                    <p className="text-sm text-destructive">
                      {profileForm.formState.errors.phoneNumber.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    {...profileForm.register("address")}
                  />
                </div>
              </div>

              {/* Social Links */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Social Links</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn</Label>
                    <Input
                      id="linkedin"
                      type="url"
                      {...profileForm.register("socialLinks.linkedin")}
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="twitter">Twitter</Label>
                    <Input
                      id="twitter"
                      type="url"
                      {...profileForm.register("socialLinks.twitter")}
                      placeholder="https://twitter.com/username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="facebook">Facebook</Label>
                    <Input
                      id="facebook"
                      type="url"
                      {...profileForm.register("socialLinks.facebook")}
                      placeholder="https://facebook.com/username"
                    />
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
                    Saving...
                  </>
                ) : (
                  'Save Profile'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Preferences Tab */}
      <TabsContent value="preferences">
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>
              Manage your notification settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="emailNotifications">Email Notifications</Label>
                  <Input
                    id="emailNotifications"
                    type="checkbox"
                    className="h-4 w-4"
                    {...profileForm.register("notifications.email")}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="smsNotifications">SMS Notifications</Label>
                  <Input
                    id="smsNotifications"
                    type="checkbox"
                    className="h-4 w-4"
                    {...profileForm.register("notifications.sms")}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="marketingNotifications">Marketing Updates</Label>
                  <Input
                    id="marketingNotifications"
                    type="checkbox"
                    className="h-4 w-4"
                    {...profileForm.register("notifications.marketing")}
                  />
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
                  'Save Preferences'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="security">
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={passwordForm.handleSubmit((data) => changePasswordMutation.mutate(data))} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  {...passwordForm.register("currentPassword")}
                />
                {passwordForm.formState.errors.currentPassword && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.currentPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  {...passwordForm.register("newPassword")}
                />
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...passwordForm.register("confirmPassword")}
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  'Change Password'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

export function UserProfileFormWrapper() {
  return (
    <ErrorBoundary>
      <UserProfileForm />
    </ErrorBoundary>
  );
}