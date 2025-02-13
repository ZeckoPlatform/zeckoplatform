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

const earlyBirdSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  companyNumber: z.string()
    .regex(/^[A-Z0-9]{1,8}$/i, "Company registration number should be up to 8 alphanumeric characters")
    .optional(),
  utrNumber: z.string()
    .regex(/^\d{10}$/, "UTR number must be exactly 10 digits")
    .optional(),
  userType: z.enum(["business", "vendor"]),
  businessType: z.enum(["registered", "self-employed"]).optional(),
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
    } else if (data.businessType === "self-employed" && !data.utrNumber) {
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
      userType: "business"
    }
  });

  const earlyBirdMutation = useMutation({
    mutationFn: async (data: EarlyBirdFormData) => {
      const response = await apiRequest("POST", "/api/early-bird/register", data);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
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
              <form onSubmit={handleSubmit((data) => earlyBirdMutation.mutate(data))} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
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
                    {...register("companyName")}
                  />
                  {errors.companyName && (
                    <p className="text-sm text-destructive">{errors.companyName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Account Type</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      type="button"
                      variant={userType === "business" ? "default" : "outline"}
                      className="w-full"
                      onClick={() => {
                        setValue("userType", "business");
                        setValue("businessType", undefined);
                        setValue("companyNumber", undefined);
                        setValue("utrNumber", undefined);
                      }}
                    >
                      Business
                    </Button>
                    <Button
                      type="button"
                      variant={userType === "vendor" ? "default" : "outline"}
                      className="w-full"
                      onClick={() => {
                        setValue("userType", "vendor");
                        setValue("businessType", undefined);
                        setValue("utrNumber", undefined);
                      }}
                    >
                      Vendor
                    </Button>
                  </div>
                </div>

                {userType === "business" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Business Type</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <Button
                          type="button"
                          variant={businessType === "registered" ? "default" : "outline"}
                          className="w-full"
                          onClick={() => {
                            setValue("businessType", "registered");
                            setValue("utrNumber", undefined);
                          }}
                        >
                          Registered Business
                        </Button>
                        <Button
                          type="button"
                          variant={businessType === "self-employed" ? "default" : "outline"}
                          className="w-full"
                          onClick={() => {
                            setValue("businessType", "self-employed");
                            setValue("companyNumber", undefined);
                          }}
                        >
                          Self-employed
                        </Button>
                      </div>
                      {errors.businessType && (
                        <p className="text-sm text-destructive">{errors.businessType.message}</p>
                      )}
                    </div>

                    {businessType === "registered" && (
                      <div className="space-y-2">
                        <Label htmlFor="companyNumber">Company Registration Number</Label>
                        <Input
                          id="companyNumber"
                          placeholder="e.g., AB123456"
                          {...register("companyNumber")}
                        />
                        {errors.companyNumber && (
                          <p className="text-sm text-destructive">{errors.companyNumber.message}</p>
                        )}
                      </div>
                    )}

                    {businessType === "self-employed" && (
                      <div className="space-y-2">
                        <Label htmlFor="utrNumber">UTR Number</Label>
                        <Input
                          id="utrNumber"
                          placeholder="e.g., 1234567890"
                          {...register("utrNumber")}
                        />
                        {errors.utrNumber && (
                          <p className="text-sm text-destructive">{errors.utrNumber.message}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {userType === "vendor" && (
                  <div className="space-y-2">
                    <Label htmlFor="companyNumber">Company Registration Number (Required)</Label>
                    <Input
                      id="companyNumber"
                      placeholder="e.g., AB123456"
                      {...register("companyNumber")}
                    />
                    {errors.companyNumber && (
                      <p className="text-sm text-destructive">{errors.companyNumber.message}</p>
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