import { useForm } from "react-hook-form";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute<{ token: string }>("/auth/reset-password/:token");
  const { toast } = useToast();
  const [isResetting, setIsResetting] = useState(false);

  const form = useForm<ResetPasswordFormData>({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!match || !params?.token) {
      toast({
        title: "Invalid Reset Link",
        description: "The password reset link is invalid or has expired.",
        variant: "destructive",
      });
      setTimeout(() => setLocation("/auth"), 1500);
    }
  }, [match, params?.token, setLocation, toast]);

  if (!match || !params?.token) {
    return (
      <Card className="w-[400px] mx-auto mt-20">
        <CardHeader>
          <CardTitle>Invalid Reset Link</CardTitle>
          <CardDescription>
            This password reset link is invalid or has expired.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            onClick={() => setLocation("/auth")}
          >
            Return to Login
          </Button>
        </CardContent>
      </Card>
    );
  }

  const onSubmit = async (formData: ResetPasswordFormData) => {
    try {
      // Initial validation
      if (!params.token) {
        throw new Error("Reset token is missing");
      }

      if (!formData.password) {
        throw new Error("Password is required");
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error("Passwords do not match");
      }

      setIsResetting(true);

      // Create the reset payload
      const resetPayload = {
        token: params.token,
        password: formData.password,
      };

      const response = await apiRequest("POST", "/api/auth/reset-password", resetPayload);
      const result = await response.json();

      toast({
        title: "Success",
        description: result.message || "Your password has been reset successfully",
      });

      setTimeout(() => {
        setLocation("/auth");
      }, 1500);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card className="w-[400px] mx-auto mt-20">
      <CardHeader>
        <CardTitle>Reset Password</CardTitle>
        <CardDescription>
          Please enter your new password below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              {...form.register("password", {
                required: "Password is required",
                minLength: {
                  value: 8,
                  message: "Password must be at least 8 characters",
                },
              })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              {...form.register("confirmPassword", {
                required: "Please confirm your password",
                minLength: {
                  value: 8,
                  message: "Password must be at least 8 characters",
                },
              })}
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={isResetting}
          >
            {isResetting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting Password...
              </>
            ) : (
              'Reset Password'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}