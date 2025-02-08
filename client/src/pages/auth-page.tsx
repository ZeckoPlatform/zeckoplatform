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
import { startTrialSubscription } from "@/lib/subscription";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const loginForm = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm({
    defaultValues: {
      username: "",
      password: "",
      userType: "free" as const,
      businessType: "",
      companyNumber: "",
      vatNumber: "",
      utrNumber: "",
      paymentMethod: "stripe" as "stripe" | "direct_debit",
      paymentFrequency: "monthly" as "monthly" | "annual",
      bankAccountHolder: "",
      bankSortCode: "",
      bankAccountNumber: "",
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
      try {
        await startTrialSubscription({
          userId: data.id,
          tier: data.userType,
          paymentMethod: data.paymentMethod,
          paymentFrequency: data.paymentFrequency,
          bankDetails: data.paymentMethod === "direct_debit" ? {
            accountHolder: data.bankAccountHolder,
            sortCode: data.bankSortCode,
            accountNumber: data.bankAccountNumber,
          } : undefined,
        });
        setLocation("/subscription");
      } catch (error: any) {
        toast({
          title: "Subscription setup failed",
          description: error.message || "Failed to setup subscription",
          variant: "destructive",
        });
      }
    } else {
      setLocation("/leads");
    }
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
            <CardTitle>Welcome to LeadMarket</CardTitle>
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
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      {...loginForm.register("password")}
                    />
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
                    <Label htmlFor="reg-username">Username</Label>
                    <Input
                      id="reg-username"
                      {...registerForm.register("username")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg-password">Password</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      {...registerForm.register("password")}
                    />
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
                        <Label htmlFor="business">Business</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="vendor" id="vendor" />
                        <Label htmlFor="vendor">Vendor</Label>
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
                            }
                          }}
                          defaultValue={registerForm.watch("businessType")}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select business type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="registered">Registered Company</SelectItem>
                            {registerForm.watch("userType") === "business" && (
                              <SelectItem value="selfEmployed">Self-employed</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {registerForm.watch("businessType") === "registered" && (
                        <>
                          <div>
                            <Label htmlFor="companyNumber">Companies House Number (Required)</Label>
                            <Input
                              id="companyNumber"
                              {...registerForm.register("companyNumber", {
                                required: "Companies House number is required for registered businesses",
                                pattern: {
                                  value: /^[A-Z0-9]{8}$/i,
                                  message: "Please enter a valid 8-character Companies House number"
                                }
                              })}
                              placeholder="8 digit number"
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
                              {...registerForm.register("vatNumber", {
                                pattern: {
                                  value: /^GB[0-9]{9}$/i,
                                  message: "Please enter a valid VAT number (e.g., GB123456789)"
                                }
                              })}
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

                      {registerForm.watch("businessType") === "selfEmployed" &&
                        registerForm.watch("userType") === "business" && (
                          <div>
                            <Label htmlFor="utrNumber">UTR Number (Required)</Label>
                            <Input
                              id="utrNumber"
                              {...registerForm.register("utrNumber", {
                                required: "UTR number is required for self-employed registration",
                                pattern: {
                                  value: /^[0-9]{10}$/,
                                  message: "Please enter a valid 10-digit UTR number"
                                }
                              })}
                              placeholder="10 digit UTR"
                            />
                            {registerForm.formState.errors.utrNumber && (
                              <p className="text-sm text-destructive mt-1">
                                {registerForm.formState.errors.utrNumber.message}
                              </p>
                            )}
                          </div>
                        )}
                    </>
                  )}

                  {(registerForm.watch("userType") === "business" ||
                    registerForm.watch("userType") === "vendor") && (
                    <>
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
                              <Label htmlFor="monthly">Monthly</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="annual" id="annual" />
                              <Label htmlFor="annual">Annual (10% discount)</Label>
                            </div>
                          </RadioGroup>
                        </div>

                        <div>
                          <Label>Payment Method</Label>
                          <RadioGroup
                            defaultValue="stripe"
                            onValueChange={(value) => {
                              registerForm.setValue("paymentMethod", value as "stripe" | "direct_debit");
                              if (value === "stripe") {
                                registerForm.setValue("bankAccountHolder", "");
                                registerForm.setValue("bankSortCode", "");
                                registerForm.setValue("bankAccountNumber", "");
                              }
                            }}
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="stripe" id="stripe" />
                              <Label htmlFor="stripe">Credit/Debit Card</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="direct_debit" id="direct_debit" />
                              <Label htmlFor="direct_debit">Direct Debit</Label>
                            </div>
                          </RadioGroup>
                        </div>

                        {registerForm.watch("paymentMethod") === "direct_debit" && (
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="bankAccountHolder">Account Holder Name</Label>
                              <Input
                                id="bankAccountHolder"
                                {...registerForm.register("bankAccountHolder", {
                                  required: "Account holder name is required for direct debit",
                                })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="bankSortCode">Sort Code</Label>
                              <Input
                                id="bankSortCode"
                                {...registerForm.register("bankSortCode", {
                                  required: "Sort code is required for direct debit",
                                  pattern: {
                                    value: /^\d{6}$/,
                                    message: "Please enter a valid 6-digit sort code",
                                  },
                                })}
                                placeholder="123456"
                              />
                            </div>
                            <div>
                              <Label htmlFor="bankAccountNumber">Account Number</Label>
                              <Input
                                id="bankAccountNumber"
                                {...registerForm.register("bankAccountNumber", {
                                  required: "Account number is required for direct debit",
                                  pattern: {
                                    value: /^\d{8}$/,
                                    message: "Please enter a valid 8-digit account number",
                                  },
                                })}
                                placeholder="12345678"
                              />
                            </div>
                          </div>
                        )}
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