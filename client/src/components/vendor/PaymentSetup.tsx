import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function PaymentSetup({ setupAccountMutation }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSetupStripe = async () => {
    setIsLoading(true);
    try {
      await setupAccountMutation.mutateAsync();
    } catch (error) {
      console.error("Failed to setup Stripe:", error);
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Setup Payment Account</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Setup Your Payment Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p>
            To start receiving payments for your products, you'll need to set up a
            Stripe account. This will allow you to:
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>Accept payments from customers worldwide</li>
            <li>Receive automatic payouts to your bank account</li>
            <li>Access detailed financial reporting</li>
            <li>Manage refunds and disputes</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            You'll be redirected to Stripe to complete your account setup.
          </p>
          <Button
            className="w-full"
            onClick={handleSetupStripe}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : (
              "Set up Stripe Account"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
