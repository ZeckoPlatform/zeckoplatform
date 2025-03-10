import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await apiRequest("POST", "/api/auth/forgot-password", { email });
      const data = await response.json();

      if (response.status === 400 && data.message.includes('needs to be verified')) {
        // Show verification required message
        toast({
          title: "Verification Required",
          description: data.message,
          variant: "destructive",
        });
      } else if (!response.ok) {
        throw new Error(data.message || "Failed to process request");
      } else {
        // Success case
        toast({
          title: "Check your email",
          description: "If an account exists with this email, you will receive password reset instructions.",
        });
        setEmail("");
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email address"
          required
          disabled={isSubmitting}
          className="w-full"
        />
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || !email}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending Reset Link...
          </>
        ) : (
          'Send Reset Link'
        )}
      </Button>
      <p className="text-sm text-muted-foreground text-center mt-2">
        We'll send you an email with instructions to reset your password.
      </p>
    </form>
  );
}