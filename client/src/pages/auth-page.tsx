import { useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  phoneNumber: z.string()
    .min(1, "Phone number is required")
    .refine((val) => {
      const userType = registerForm.getValues("userType");
      // Skip phone format validation for free users
      if (userType === "free") return true;

      const country = registerForm.getValues("countryCode");
      return PHONE_COUNTRY_CODES[country].pattern.test(val);
    }, {
      message: "Please enter a valid phone number"
    }),
  businessName: z.string().min(2, "Company name must be at least 2 characters").optional(),
  companyNumber: z.string()
    .regex(/^[A-Z0-9]{8}$/, "Please enter a valid 8-character Companies House number")
    .optional(),
  vatNumber: z.string()
    .regex(/^GB[0-9]{9}$/, "Please enter a valid UK VAT number")
    .optional(),
  utrNumber: z.string()
    .regex(/^[0-9]{10}$/, "Please enter a valid 10-digit UTR number")
    .optional(),
  einNumber: z.string()
    .regex(/^\d{2}-\d{7}$/, "Please enter a valid EIN (XX-XXXXXXX)")
    .optional(),
  registeredState: z.string().optional(),
  stateRegistrationNumber: z.string().optional(),
  paymentFrequency: z.enum(["monthly", "annual"]).optional(),
}).superRefine((data, ctx) => {
  if (data.userType === "business" || data.userType === "vendor") {
    if (!data.businessName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${data.userType === "business" ? "Business" : "Vendor"} name is required`,
        path: ["businessName"]
      });
    }

    if (data.countryCode === "GB") {
      if (!data.companyNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Companies House number is required for UK businesses",
          path: ["companyNumber"]
        });
      }
      if (data.userType === "vendor" && !data.utrNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "UTR number is required for UK vendors",
          path: ["utrNumber"]
        });
      }
    }

    if (data.countryCode === "US") {
      if (!data.einNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "EIN is required for US businesses",
          path: ["einNumber"]
        });
      }
      if (!data.registeredState) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "State registration is required for US businesses",
          path: ["registeredState"]
        });
      }
    }
  }
  return true;
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [location, setLocation] = useLocation();
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
      businessName: "",
      companyNumber: "",
      vatNumber: "",
      utrNumber: "",
      einNumber: "",
      registeredState: "",
      stateRegistrationNumber: "",
      paymentFrequency: "monthly",
      phoneNumber: ""
    },
  });

  const selectedCountry = registerForm.watch("countryCode");
  const selectedUserType = registerForm.watch("userType");

  const onLoginSuccess = (data: any) => {
    switch (data.userType) {
      case "vendor":
        setLocation("/vendor");
        break;
      case "business":
      case "free":
        setLocation("/leads");
        break;
      default:
        setLocation("/");
    }
  };

  const onRegisterSuccess = (data: any) => {
    if (data.userType !== "free") {
      setLocation("/subscription");
    } else {
      setLocation("/leads");
    }
  };

  if (user) {
    return <Redirect to="/" />;
  }

  const getSubscriptionPrice = (userType: "business" | "vendor", frequency: "monthly" | "annual") => {
    const countryPrices = SUBSCRIPTION_PRICES[selectedCountry];
    if (!countryPrices) return null;
    const prices = countryPrices[userType][frequency];
    const symbol = CURRENCY_SYMBOLS[selectedCountry];
    return {
      base: `${symbol}${prices.base.toFixed(2)}`,
      tax: prices.tax || prices.vat ? `${symbol}${(prices.tax || prices.vat).toFixed(2)}` : null,
      total: `${symbol}${prices.total.toFixed(2)}`,
    };
  };

  const formatPhoneNumber = (value: string, country: "GB" | "US", userType: string) => {
    // For free users, just return the cleaned input without formatting
    if (userType === "free") {
      return value.replace(/[^\d+]/g, "");
    }

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
                    loginMutation.mutate(data, {
                      onSuccess: onLoginSuccess,
                    })
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
                  onSubmit={registerForm.handleSubmit((data) =>
                    registerMutation.mutate(data, {
                      onSuccess: onRegisterSuccess,
                    })
                  )}
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
                    <Label>Country</Label>
                    <Select
                      onValueChange={(value: "GB" | "US") => {
                        registerForm.setValue("countryCode", value);
                        // Reset phone number when country changes
                        registerForm.setValue("phoneNumber", "");
                        // Reset country-specific fields
                        registerForm.setValue("companyNumber", "");
                        registerForm.setValue("vatNumber", "");
                        registerForm.setValue("utrNumber", "");
                        registerForm.setValue("einNumber", "");
                        registerForm.setValue("registeredState", "");
                        registerForm.setValue("stateRegistrationNumber", "");
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

                  <div>
                    <Label>Account Type</Label>
                    <RadioGroup
                      defaultValue="free"
                      onValueChange={(value) => {
                        registerForm.setValue("userType", value as "free" | "business" | "vendor");
                        registerForm.setValue("businessName", "");
                        registerForm.setValue("companyNumber", "");
                        registerForm.setValue("vatNumber", "");
                        registerForm.setValue("utrNumber", "");
                        registerForm.setValue("einNumber", "");
                        registerForm.setValue("registeredState", "");
                        registerForm.setValue("stateRegistrationNumber", "");
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
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showResetPassword} onOpenChange={setShowResetPassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you instructions to reset your password.
            </DialogDescription>
          </DialogHeader>
          <ForgotPasswordForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}