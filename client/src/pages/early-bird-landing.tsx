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
    .regex(/^(?:[0-9]{8}|[A-Za-z]{2}[0-9]{6})$/, "Please enter a valid company number (8 digits or 2 letters followed by 6 digits)")
    .optional(),
  utrNumber: z.string()
    .regex(/^\d{10}$/, "UTR number must be exactly 10 digits")
    .optional(),
  userType: z.enum(["business", "vendor"]),
  businessType: z.enum(["registered", "selfEmployed"]).optional(),
}).superRefine((data, ctx) => {
  if (data.userType === "vendor" && !data.companyNumber) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Company registration number is required for vendors",
      path: ["companyNumber"]
    });
  }
  if (data.userType === "business") {
    if (!data.businessType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select your business type",
        path: ["businessType"]
      });
    } else if (data.businessType === "registered" && !data.companyNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Company registration number is required for registered businesses",
        path: ["companyNumber"]
      });
    } else if (data.businessType === "selfEmployed" && !data.utrNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "UTR number is required for self-employed businesses",
        path: ["utrNumber"]
      });
    }
  }
  return true;
});

type EarlyBirdFormData = z.infer<typeof earlyBirdSchema>;

export default function EarlyBirdLanding() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<EarlyBirdFormData>({
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
        throw new Error(error.message || "Registration failed");
      }
      return response.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Registration Successful",
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

  const userType = watch("userType");
  const businessType = watch("businessType");

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
              <form onSubmit={handleSubmit((data) => {
                console.log("Form data:", data); 
                earlyBirdMutation.mutate(data);
              })} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@company.com"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    placeholder="Your Company Ltd"
                    {...register("companyName")}
                  />
                  {errors.companyName && (
                    <p className="text-sm text-destructive">{errors.companyName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Account Type</Label>
                  <RadioGroup
                    defaultValue="business"
                    onValueChange={(value) => {
                      setValue("userType", value as "business" | "vendor");
                      if (value === "vendor") {
                        setValue("businessType", undefined);
                        setValue("utrNumber", undefined);
                      } else {
                        setValue("businessType", "registered");
                        setValue("companyNumber", undefined);
                        setValue("utrNumber", undefined);
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
                        setValue("businessType", value as "registered" | "selfEmployed");
                        if (value === "registered") {
                          setValue("utrNumber", undefined);
                        } else {
                          setValue("companyNumber", undefined);
                        }
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
                    {errors.businessType && (
                      <p className="text-sm text-destructive">{errors.businessType.message}</p>
                    )}
                  </div>
                )}

                {((userType === "business" && businessType === "registered") || userType === "vendor") && (
                  <div className="space-y-2">
                    <Label htmlFor="companyNumber">Company Registration Number</Label>
                    <Input
                      id="companyNumber"
                      placeholder="e.g., 12345678 or SC123456"
                      {...register("companyNumber")}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter your 8-digit Companies House registration number
                    </p>
                    {errors.companyNumber && (
                      <p className="text-sm text-destructive">{errors.companyNumber.message}</p>
                    )}
                  </div>
                )}

                {userType === "business" && businessType === "selfEmployed" && (
                  <div className="space-y-2">
                    <Label htmlFor="utrNumber">UTR Number</Label>
                    <Input
                      id="utrNumber"
                      placeholder="e.g., 1234567890"
                      {...register("utrNumber")}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter your 10-digit Unique Taxpayer Reference number
                    </p>
                    {errors.utrNumber && (
                      <p className="text-sm text-destructive">{errors.utrNumber.message}</p>
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