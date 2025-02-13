import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, Mail, Building2, Receipt } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const earlyBirdSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  companyNumber: z.string()
    .regex(/^[0-9]{8}$/, "Please enter a valid 8-character Companies House number")
    .optional(),
  utrNumber: z.string()
    .regex(/^[0-9]{10}$/, "Please enter a valid 10-digit UTR number")
    .optional(),
  userType: z.enum(["business", "vendor"]),
  businessType: z.enum(["registered", "selfEmployed"]).optional(),
}).refine((data) => {
  if (data.userType === "business") {
    if (data.businessType === "registered") {
      return !!data.businessName && !!data.companyNumber;
    }
    if (data.businessType === "selfEmployed") {
      return !!data.utrNumber;
    }
  }
  if (data.userType === "vendor") {
    return !!data.businessName && !!data.companyNumber;
  }
  return true;
}, {
  message: "Please fill in all required business information",
  path: ["businessType"],
});

type EarlyBirdFormData = z.infer<typeof earlyBirdSchema>;

export default function EarlyBirdLanding() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<EarlyBirdFormData>({
    resolver: zodResolver(earlyBirdSchema),
    defaultValues: {
      email: "",
      companyName: "",
      userType: "business",
      businessType: "registered",
      companyNumber: "",
      utrNumber: "",
    }
  });

  const earlyBirdMutation = useMutation({
    mutationFn: async (data: EarlyBirdFormData) => {
      const response = await apiRequest("POST", "/api/early-bird/register", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to register for early access");
      }
      return response.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Success",
        description: "Thank you for registering! We'll notify you when we launch.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const userType = form.watch("userType");
  const businessType = form.watch("businessType");

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
              <Check className="h-6 w-6 text-green-500" />
              Registration Successful!
            </CardTitle>
            <CardDescription>
              Thank you for registering for early access to Zecko. We'll notify you when we launch!
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">
              Get Early Access to Zecko
            </h1>
            <p className="text-xl text-muted-foreground">
              Join the UK's most advanced marketplace platform for businesses
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Business Growth
                </CardTitle>
                <CardDescription>
                  Connect with verified vendors and grow your business network
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Early Bird Pricing
                </CardTitle>
                <CardDescription>
                  Lock in special rates available only during pre-launch
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Priority Access
                </CardTitle>
                <CardDescription>
                  Be among the first to access new features and updates
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Registration Form */}
          <Card>
            <CardHeader>
              <CardTitle>Register for Early Access</CardTitle>
              <CardDescription>
                Complete the form below to secure your spot
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={form.handleSubmit((data) => {
                  earlyBirdMutation.mutate(data);
                })}
              >
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.register("email")}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    {...form.register("companyName")}
                  />
                  {form.formState.errors.companyName && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.companyName.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Account Type</Label>
                  <RadioGroup
                    defaultValue="business"
                    onValueChange={(value) => {
                      form.setValue("userType", value as "business" | "vendor");
                      form.setValue("companyName", "");
                      form.setValue("companyNumber", "");
                      form.setValue("utrNumber", "");
                      if (value === "business") {
                        form.setValue("businessType", "registered");
                      }
                    }}
                  >
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

                {userType === "business" && (
                  <div>
                    <Label>Business Type</Label>
                    <RadioGroup
                      defaultValue="registered"
                      onValueChange={(value) => {
                        form.setValue("businessType", value as "registered" | "selfEmployed");
                        form.setValue("companyName", "");
                        form.setValue("companyNumber", "");
                        form.setValue("utrNumber", "");
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="registered" id="registered" />
                        <Label htmlFor="registered">Registered Company</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="selfEmployed" id="selfEmployed" />
                        <Label htmlFor="selfEmployed">Self-employed</Label>
                      </div>
                    </RadioGroup>
                    {form.formState.errors.businessType && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.businessType.message}
                      </p>
                    )}
                  </div>
                )}

                {((userType === "business" &&
                  businessType === "registered") ||
                  userType === "vendor") && (
                  <>
                    <div>
                      <Label htmlFor="companyNumber">Companies House Number</Label>
                      <Input
                        id="companyNumber"
                        {...form.register("companyNumber")}
                        placeholder="12345678"
                      />
                      {form.formState.errors.companyNumber && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.companyNumber.message}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {userType === "business" &&
                  businessType === "selfEmployed" && (
                  <div>
                    <Label htmlFor="utrNumber">UTR Number</Label>
                    <Input
                      id="utrNumber"
                      {...form.register("utrNumber")}
                      placeholder="1234567890"
                    />
                    {form.formState.errors.utrNumber && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.utrNumber.message}
                      </p>
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={earlyBirdMutation.isPending}
                >
                  {earlyBirdMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    "Register for Early Access"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}