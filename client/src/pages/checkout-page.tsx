import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const checkoutSchema = z.object({
  // Shipping Address
  shippingAddress: z.object({
    fullName: z.string().min(1, "Full name is required"),
    street: z.string().min(1, "Street address is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State/Province is required"),
    postalCode: z.string().min(1, "Postal code is required"),
    country: z.string().min(1, "Country is required"),
    phone: z.string().min(1, "Phone number is required"),
  }),
  // Billing Address
  billingAddress: z.object({
    companyName: z.string().optional(),
    vatNumber: z.string().optional(),
    street: z.string().min(1, "Street address is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State/Province is required"),
    postalCode: z.string().min(1, "Postal code is required"),
    country: z.string().min(1, "Country is required"),
  }),
  // Additional Information
  specialInstructions: z.string().optional(),
});

export default function CheckoutPage() {
  const { user } = useAuth();
  const cart = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [sameAsShipping, setSameAsShipping] = useState(true);

  const form = useForm<z.infer<typeof checkoutSchema>>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      shippingAddress: {
        fullName: "",
        street: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
        phone: "",
      },
      billingAddress: {
        companyName: "",
        vatNumber: "",
        street: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
      },
      specialInstructions: "",
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: z.infer<typeof checkoutSchema>) => {
      const orderData = {
        items: cart.items.map(item => ({
          productId: item.id,
          quantity: item.quantity,
        })),
        ...data,
      };
      
      const res = await apiRequest("POST", "/api/orders", orderData);
      return res.json();
    },
    onSuccess: async (data) => {
      // Initialize Stripe payment using the client secret
      if (window.Stripe) {
        const stripe = window.Stripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
        const { error } = await stripe.confirmPayment({
          elements: data.clientSecret,
          confirmParams: {
            return_url: `${window.location.origin}/orders/${data.orders[0].id}`,
          },
        });

        if (error) {
          toast({
            title: "Payment failed",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Checkout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof checkoutSchema>) => {
    if (sameAsShipping) {
      data.billingAddress = {
        ...data.shippingAddress,
        companyName: data.billingAddress.companyName,
        vatNumber: data.billingAddress.vatNumber,
      };
    }
    createOrderMutation.mutate(data);
  };

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (cart.items.length === 0) {
    navigate("/marketplace");
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Shipping Address */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Shipping Address</h2>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="shippingAddress.fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Add other shipping address fields similarly */}
                </div>
              </Card>

              {/* Billing Address */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Billing Address</h2>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="billingAddress.companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="billingAddress.vatNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>VAT Number (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Add other billing address fields */}
                </div>
              </Card>

              {/* Special Instructions */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Additional Information</h2>
                <FormField
                  control={form.control}
                  name="specialInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Instructions (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Card>

              <Button
                type="submit"
                className="w-full"
                disabled={createOrderMutation.isPending}
              >
                {createOrderMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Place Order'
                )}
              </Button>
            </form>
          </Form>
        </div>

        {/* Order Summary */}
        <div>
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            <div className="space-y-4">
              {cart.items.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span>{item.title} x {item.quantity}</span>
                  <span>£{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <hr />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>£{cart.total.toFixed(2)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
