import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createCheckoutSession } from "@/lib/subscription";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  userType: string;
}

export function SubscriptionRequiredModal({ isOpen, onClose, userType }: SubscriptionRequiredModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async (tier: "business" | "vendor", frequency: "monthly" | "annual") => {
    try {
      setIsLoading(true);
      const { checkoutUrl } = await createCheckoutSession(tier, frequency);
      window.location.href = checkoutUrl;
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start subscription process",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Subscription Required</DialogTitle>
          <DialogDescription>
            Start your 30-day free trial to access all features.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Monthly Plan</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Perfect for getting started
              </p>
              <Button
                onClick={() => handleSubscribe(userType as "business" | "vendor", "monthly")}
                disabled={isLoading}
                className="w-full"
              >
                Start Free Trial
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                £29.99/month for Business
                <br />
                £49.99/month for Vendor
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Annual Plan (Save 10%)</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Best value for long-term commitment
              </p>
              <Button
                onClick={() => handleSubscribe(userType as "business" | "vendor", "annual")}
                disabled={isLoading}
                className="w-full"
                variant="secondary"
              >
                Start Free Trial
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                £323.89/year for Business (£26.99/month)
                <br />
                £539.89/year for Vendor (£44.99/month)
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}