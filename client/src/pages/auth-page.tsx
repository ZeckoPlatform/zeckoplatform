import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

const COUNTRIES = {
  GB: "United Kingdom",
  US: "United States",
};

const CURRENCY_SYMBOLS = {
  GB: "£",
  US: "$",
};

const SUBSCRIPTION_PRICES = {
  GB: {
    business: {
      monthly: {
        base: 29.99,
        vat: 29.99 * 0.20,
        total: 29.99 * 1.20
      },
      annual: {
        base: (29.99 * 12 * 0.9),
        vat: (29.99 * 12 * 0.9) * 0.20,
        total: (29.99 * 12 * 0.9) * 1.20
      },
    },
    vendor: {
      monthly: {
        base: 49.99,
        vat: 49.99 * 0.20,
        total: 49.99 * 1.20
      },
      annual: {
        base: (49.99 * 12 * 0.9),
        vat: (49.99 * 12 * 0.9) * 0.20,
        total: (49.99 * 12 * 0.9) * 1.20
      },
    }
  },
  US: {
    business: {
      monthly: {
        base: 37.99,  // ~£29.99 * 1.26
        tax: 0,
        total: 37.99
      },
      annual: {
        base: (37.99 * 12 * 0.9),
        tax: 0,
        total: (37.99 * 12 * 0.9)
      },
    },
    vendor: {
      monthly: {
        base: 62.99,  // ~£49.99 * 1.26
        tax: 0,
        total: 62.99
      },
      annual: {
        base: (62.99 * 12 * 0.9),
        tax: 0,
        total: (62.99 * 12 * 0.9)
      },
    }
  }
};

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  userType: z.enum(["free", "business", "vendor"]),
  countryCode: z.enum(["GB", "US"]),
  phoneNumber: z.string().min(1, "Phone number is required"),
  businessName: z.string().min(2, "Company name must be at least 2 characters").optional(),
  companyNumber: z.string().optional(),
  vatNumber: z.string().optional(),
  utrNumber: z.string().optional(),
  einNumber: z.string().optional(),
  registeredState: z.string().optional(),
  stateRegistrationNumber: z.string().optional(),
  paymentFrequency: z.enum(["monthly", "annual"]).optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showResetPassword, setShowResetPassword] = useState(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      userType: "free",
      countryCode: "GB",
      phoneNumber: "",
      businessName: "",
      companyNumber: "",
      vatNumber: "",
      utrNumber: "",
      einNumber: "",
      registeredState: "",
      stateRegistrationNumber: "",
      paymentFrequency: "monthly",
    },
  });

  const selectedCountry = registerForm.watch("countryCode");
  const selectedUserType = registerForm.watch("userType");

  const getSubscriptionPrice = (userType: "business" | "vendor", frequency: "monthly" | "annual") => {
    const countryPrices = SUBSCRIPTION_PRICES[selectedCountry];
    if (!countryPrices) return null;
    const prices = countryPrices[userType][frequency];
    const symbol = CURRENCY_SYMBOLS[selectedCountry];
    return {
      base: `${symbol}${prices.base.toFixed(2)}`,
      tax: selectedCountry === 'US' ? 
        (prices.tax ? `${symbol}${prices.tax.toFixed(2)}` : null) : 
        `${symbol}${prices.vat.toFixed(2)}`,
      total: `${symbol}${prices.total.toFixed(2)}`,
    };
  };

  const handleRegisterSubmit = async (data: RegisterFormData) => {
    try {
      console.log('Starting registration with data:', data);

      // Prepare registration data
      const registrationData: any = {
        email: data.email,
        password: data.password,
        userType: data.userType,
        countryCode: data.countryCode,
        phoneNumber: formatPhoneNumber(data.phoneNumber, data.countryCode, data.userType),
      };

      // Only add business-specific fields if not a free user
      if (data.userType !== "free") {
        // Validate business/vendor specific fields
        if (!data.businessName) {
          console.log('Business name validation failed');
          registerForm.setError("businessName", {
            type: "custom",
            message: `${data.userType === "business" ? "Business" : "Vendor"} name is required`,
          });
          return;
        }

        Object.assign(registrationData, {
          businessName: data.businessName,
          companyNumber: data.companyNumber,
          vatNumber: data.vatNumber,
          utrNumber: data.utrNumber,
          einNumber: data.einNumber,
          registeredState: data.registeredState,
          stateRegistrationNumber: data.stateRegistrationNumber,
          paymentFrequency: data.paymentFrequency,
        });
      }

      console.log('Submitting registration:', registrationData);

      const result = await registerMutation.mutateAsync(registrationData);

      console.log('Registration successful:', result);

      toast({
        title: "Registration successful",
        description: "Your account has been created successfully.",
      });

      if (data.userType !== "free") {
        setLocation("/subscription");
      } else {
        setLocation("/leads");
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Registration failed",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatPhoneNumber = (value: string, country: "GB" | "US", userType: string) => {
    // Remove all non-digits first
    const digits = value.replace(/[^\d+]/g, "");

    // For free users, just return the cleaned number
    if (userType === "free") {
      // If it starts with a plus, keep it, otherwise add the country code
      if (digits.startsWith('+')) {
        return digits;
      }
      return country === "GB" ? `+44${digits}` : `+1${digits}`;
    }

    // For business/vendor users, apply country-specific formatting
    if (country === "US") {
      if (digits.length <= 1) return digits;
      if (digits.length <= 3) return `+1 (${digits}`;
      if (digits.length <= 6) return `+1 (${digits.slice(0, 3)}) ${digits.slice(3)}`;
      return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    } else {
      if (digits.length <= 1) return digits;
      if (digits.length <= 4) return `+44 ${digits}`;
      return `+44 ${digits.slice(0, 4)} ${digits.slice(4, 10)}`;
    }
  };

  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:block relative">
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-background/50" />
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div className="max-w-md text-white">
            <h2 className="text-3xl font-bold mb-4">
              Your Business Growth Platform
            </h2>
            <p className="text-lg">
              Connect with leads, grow your business, and sell your products all in one place.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Welcome to Zecko</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form
                  onSubmit={loginForm.handleSubmit((data) =>
                    loginMutation.mutate(data)
                  )}
                  className="space-y-4"
                >
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      {...loginForm.register("email")}
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-sm text-destructive mt-1">
                        {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      {...loginForm.register("password")}
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-destructive mt-1">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-between items-center">
                    <Button
                      type="button"
                      variant="link"
                      className="px-0"
                      onClick={() => setShowResetPassword(true)}
                    >
                      Forgot Password?
                    </Button>
                    <Button
                      type="submit"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Logging in...
                        </>
                      ) : (
                        "Login"
                      )}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form 
                  onSubmit={registerForm.handleSubmit(handleRegisterSubmit)} 
                  className="space-y-4"
                >
                  <div>
                    <Label htmlFor="reg-email">Email</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      {...registerForm.register("email")}
                    />
                    {registerForm.formState.errors.email && (
                      <p className="text-sm text-destructive mt-1">
                        {registerForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="reg-password">Password</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      {...registerForm.register("password")}
                    />
                    {registerForm.formState.errors.password && (
                      <p className="text-sm text-destructive mt-1">
                        {registerForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Account Type</Label>
                    <RadioGroup
                      defaultValue="free"
                      onValueChange={(value) => {
                        registerForm.setValue("userType", value as "free" | "business" | "vendor");
                        // Reset business-related fields when switching to free
                        if (value === "free") {
                          registerForm.setValue("businessName", "");
                          registerForm.setValue("companyNumber", "");
                          registerForm.setValue("vatNumber", "");
                          registerForm.setValue("utrNumber", "");
                          registerForm.setValue("einNumber", "");
                          registerForm.setValue("registeredState", "");
                          registerForm.setValue("stateRegistrationNumber", "");
                          registerForm.setValue("paymentFrequency", "monthly");
                        }
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="free" id="free" />
                        <Label htmlFor="free">Free User</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="business" id="business" />
                        <Label htmlFor="business">
                          Business
                          {selectedUserType === "business" && (
                            <span className="ml-1 text-sm text-muted-foreground">
                              ({getSubscriptionPrice("business", "monthly")?.total}/month)
                            </span>
                          )}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="vendor" id="vendor" />
                        <Label htmlFor="vendor">
                          Vendor
                          {selectedUserType === "vendor" && (
                            <span className="ml-1 text-sm text-muted-foreground">
                              ({getSubscriptionPrice("vendor", "monthly")?.total}/month)
                            </span>
                          )}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <Label>Country</Label>
                    <Select
                      onValueChange={(value: "GB" | "US") => {
                        registerForm.setValue("countryCode", value);
                        registerForm.setValue("phoneNumber", "");
                      }}
                      defaultValue={registerForm.getValues("countryCode")}
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

                  <div>
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      {...registerForm.register("phoneNumber")}
                      placeholder={selectedUserType === "free" ? "Enter your phone number" : PHONE_COUNTRY_CODES[selectedCountry].format}
                      onChange={(e) => {
                        const formatted = formatPhoneNumber(e.target.value, selectedCountry, selectedUserType);
                        registerForm.setValue("phoneNumber", formatted);
                      }}
                    />
                    {registerForm.formState.errors.phoneNumber && (
                      <p className="text-sm text-destructive mt-1">
                        {registerForm.formState.errors.phoneNumber.message}
                      </p>
                    )}
                  </div>

                  {(selectedUserType === "business" || selectedUserType === "vendor") && (
                    <>
                      <div>
                        <Label htmlFor="businessName">Business Name</Label>
                        <Input
                          id="businessName"
                          {...registerForm.register("businessName")}
                          placeholder="Enter your business name"
                        />
                        {registerForm.formState.errors.businessName && (
                          <p className="text-sm text-destructive mt-1">
                            {registerForm.formState.errors.businessName.message}
                          </p>
                        )}
                      </div>

                      {selectedCountry === "GB" ? (
                        <>
                          <div>
                            <Label htmlFor="companyNumber">Companies House Number</Label>
                            <Input
                              id="companyNumber"
                              {...registerForm.register("companyNumber")}
                              placeholder="12345678"
                            />
                            {registerForm.formState.errors.companyNumber && (
                              <p className="text-sm text-destructive mt-1">
                                {registerForm.formState.errors.companyNumber.message}
                              </p>
                            )}
                          </div>

                          {selectedUserType === "vendor" && (
                            <div>
                              <Label htmlFor="utrNumber">UTR Number</Label>
                              <Input
                                id="utrNumber"
                                {...registerForm.register("utrNumber")}
                                placeholder="1234567890"
                              />
                              {registerForm.formState.errors.utrNumber && (
                                <p className="text-sm text-destructive mt-1">
                                  {registerForm.formState.errors.utrNumber.message}
                                </p>
                              )}
                            </div>
                          )}

                          <div>
                            <Label htmlFor="vatNumber">VAT Number (Optional)</Label>
                            <Input
                              id="vatNumber"
                              {...registerForm.register("vatNumber")}
                              placeholder="GB123456789"
                            />
                            {registerForm.formState.errors.vatNumber && (
                              <p className="text-sm text-destructive mt-1">
                                {registerForm.formState.errors.vatNumber.message}
                              </p>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <Label htmlFor="einNumber">EIN (Tax ID)</Label>
                            <Input
                              id="einNumber"
                              {...registerForm.register("einNumber")}
                              placeholder="XX-XXXXXXX"
                            />
                            {registerForm.formState.errors.einNumber && (
                              <p className="text-sm text-destructive mt-1">
                                {registerForm.formState.errors.einNumber.message}
                              </p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="registeredState">Registered State</Label>
                            <Select
                              onValueChange={(value) => registerForm.setValue("registeredState", value)}
                              defaultValue={registerForm.getValues("registeredState")}
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
                            {registerForm.formState.errors.registeredState && (
                              <p className="text-sm text-destructive mt-1">
                                {registerForm.formState.errors.registeredState.message}
                              </p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="stateRegistrationNumber">State Registration Number</Label>
                            <Input
                              id="stateRegistrationNumber"
                              {...registerForm.register("stateRegistrationNumber")}
                            />
                            {registerForm.formState.errors.stateRegistrationNumber && (
                              <p className="text-sm text-destructive mt-1">
                                {registerForm.formState.errors.stateRegistrationNumber.message}
                              </p>
                            )}
                          </div>
                        </>
                      )}

                      <div className="space-y-4 mt-4">
                        <Label>Payment Preferences</Label>
                        <div>
                          <Label>Billing Frequency</Label>
                          <RadioGroup
                            defaultValue="monthly"
                            onValueChange={(value) =>
                              registerForm.setValue("paymentFrequency", value as "monthly" | "annual")
                            }
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="monthly" id="monthly" />
                              <Label htmlFor="monthly">
                                Monthly ({getSubscriptionPrice(selectedUserType, "monthly")?.total}/month)
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="annual" id="annual" />
                              <Label htmlFor="annual">
                                Annual ({getSubscriptionPrice(selectedUserType, "annual")?.total}/year - Save 10%)
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </div>
                    </>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.isPending}
                    onClick={() => {
                      // Add form validation check
                      if (Object.keys(registerForm.formState.errors).length > 0) {
                        console.log('Form validation errors:', registerForm.formState.errors);
                        toast({
                          title: "Validation Error",
                          description: "Please check all fields are filled correctly.",
                          variant: "destructive",
                        });
                        return;
                      }
                    }}
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      'Register'
                    )}
                  </Button>

                  {registerMutation.isError && (
                    <p className="text-sm text-destructive mt-2">
                      {registerMutation.error instanceof Error 
                        ? registerMutation.error.message 
                        : "An error occurred during registration"}
                    </p>
                  )}
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}