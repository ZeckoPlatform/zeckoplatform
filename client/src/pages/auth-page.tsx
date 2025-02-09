import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const SUBSCRIPTION_PRICES = {
  business: {
    monthly: 29.99,
    annual: (29.99 * 12 * 0.9).toFixed(2), // 10% annual discount
  },
  vendor: {
    monthly: 49.99,
    annual: (49.99 * 12 * 0.9).toFixed(2), // 10% annual discount
  }
};

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
});

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  userType: z.enum(["free", "business", "vendor"]),
  businessType: z.string().optional(),
  companyNumber: z.string()
    .regex(/^[A-Z0-9]{8}$/, "Please enter a valid 8-character Companies House number")
    .optional(),
  vatNumber: z.string()
    .regex(/^GB[0-9]{9}$/, "Please enter a valid UK VAT number (format: GB123456789)")
    .optional(),
  utrNumber: z.string()
    .regex(/^[0-9]{10}$/, "Please enter a valid 10-digit UTR number")
    .optional(),
  paymentFrequency: z.enum(["monthly", "annual"]),
}).refine((data) => {
  if (data.userType === "business" && data.businessType === "registered") {
    return !!data.companyNumber;
  }
  if (data.userType === "vendor") {
    return !!data.utrNumber;
  }
  return true;
}, {
  message: "Required business information missing",
  path: ["businessType"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
      userType: "free",
      businessType: "",
      companyNumber: "",
      vatNumber: "",
      utrNumber: "",
      paymentFrequency: "monthly",
    },
  });

  const onLoginSuccess = (data: any) => {
    switch (data.userType) {
      case "free":
        setLocation("/leads");
        break;
      case "business":
        setLocation("/leads");
        break;
      case "vendor":
        setLocation("/vendor");
        break;
      default:
        setLocation("/");
    }
  };

  const onRegisterSuccess = async (data: any) => {
    if (data.userType !== "free") {
      setLocation("/subscription");
    } else {
      setLocation("/leads");
    }
  };

  const getSubscriptionPrice = () => {
    const userType = registerForm.watch("userType");
    const frequency = registerForm.watch("paymentFrequency");
    if (userType === "free" || !SUBSCRIPTION_PRICES[userType]) return null;
    return SUBSCRIPTION_PRICES[userType][frequency];
  };

  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:block relative">
        <img
          src="https://images.unsplash.com/photo-1513530534585-c7b1394c6d51"
          alt="Business"
          className="absolute inset-0 h-full w-full object-cover"
        />
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
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      {...loginForm.register("username")}
                    />
                    {loginForm.formState.errors.username && (
                      <p className="text-sm text-destructive mt-1">
                        {loginForm.formState.errors.username.message}
                      </p>
                    )}
                  </div>
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
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    Login
                  </Button>
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
                    <Label htmlFor="reg-username">Username</Label>
                    <Input
                      id="reg-username"
                      {...registerForm.register("username")}
                    />
                    {registerForm.formState.errors.username && (
                      <p className="text-sm text-destructive mt-1">
                        {registerForm.formState.errors.username.message}
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
                        if (value === "free") {
                          registerForm.setValue("businessType", "");
                          registerForm.setValue("companyNumber", "");
                          registerForm.setValue("vatNumber", "");
                          registerForm.setValue("utrNumber", "");
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
                          Business (£{SUBSCRIPTION_PRICES.business.monthly}/month)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="vendor" id="vendor" />
                        <Label htmlFor="vendor">
                          Vendor (£{SUBSCRIPTION_PRICES.vendor.monthly}/month)
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {(registerForm.watch("userType") === "business" ||
                    registerForm.watch("userType") === "vendor") && (
                    <>
                      <div>
                        <Label htmlFor="businessType">Business Type</Label>
                        <Select
                          onValueChange={(value) => {
                            registerForm.setValue("businessType", value);
                            if (value === "registered") {
                              registerForm.setValue("utrNumber", "");
                            } else if (value === "selfEmployed") {
                              registerForm.setValue("companyNumber", "");
                              registerForm.setValue("vatNumber", "");
                            }
                          }}
                          defaultValue={registerForm.watch("businessType")}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select business type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="registered">Registered Company</SelectItem>
                            <SelectItem value="selfEmployed">Self-employed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {registerForm.watch("businessType") === "registered" && (
                        <>
                          <div>
                            <Label htmlFor="companyNumber">Companies House Number (Required)</Label>
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
                      )}

                      {(registerForm.watch("businessType") === "selfEmployed" ||
                        registerForm.watch("userType") === "vendor") && (
                        <div>
                          <Label htmlFor="utrNumber">UTR Number (Required)</Label>
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
                                Monthly (£{getSubscriptionPrice()}/month)
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="annual" id="annual" />
                              <Label htmlFor="annual">
                                Annual (£{SUBSCRIPTION_PRICES[registerForm.watch("userType")]?.annual}/year - Save 10%)
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
                    Register
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}