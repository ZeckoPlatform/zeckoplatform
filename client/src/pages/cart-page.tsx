import { useCart } from "@/hooks/use-cart";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { calculateShippingOptions, type ShippingOption } from "@/lib/shipping-calculator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isValidUKPostcode, formatUKPostcode } from "@/lib/utils";

interface CheckoutFormData {
  fullName: string;
  email: string;
  address: string;
  city: string;
  postcode: string;
  phone: string;
}

export default function CartPage() {
  const cart = useCart();
  const subtotal = cart.getTotal();
  const { toast } = useToast();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption>();
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);

  // Calculate shipping details
  const totalWeight = cart.items.reduce((total, item) => total + (item.weight || 0), 0);
  const dimensions = cart.items.map(item => item.dimensions || { length: 0, width: 0, height: 0 });
  const totalSize = dimensions.reduce((acc, dim) => acc + dim.length + dim.width + dim.height, 0);

  const form = useForm<CheckoutFormData>({
    defaultValues: {
      fullName: "",
      email: "",
      address: "",
      city: "",
      postcode: "",
      phone: "",
    },
    onChange: (data) => {
      // Format postcode as user types
      if (data.name === 'postcode') {
        const formattedPostcode = formatUKPostcode(data.value);
        form.setValue('postcode', formattedPostcode);
      }
    },
  });

  // Watch postcode for shipping calculation
  const postcode = form.watch("postcode");

  // Update shipping options when postcode changes
  const updateShippingOptions = (postcode: string) => {
    if (postcode.length >= 2) {
      if (!isValidUKPostcode(postcode)) {
        toast({
          title: "Invalid Postcode",
          description: "Please enter a valid UK postcode",
          variant: "destructive",
        });
        return;
      }
      const options = calculateShippingOptions(totalWeight, dimensions, postcode);
      setShippingOptions(options);
      setSelectedShipping(options[0]); // Select first option by default
    }
  };

  const total = subtotal + (selectedShipping?.price || 0);

  const checkoutMutation = useMutation({
    mutationFn: async (data: CheckoutFormData) => {
      const res = await apiRequest("POST", "/api/orders", {
        items: cart.items,
        shippingDetails: {
          ...data,
          shippingOption: selectedShipping,
        },
        total: total,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Order Placed",
        description: "Your order has been placed successfully.",
      });
      cart.clearCart();
      setCheckoutOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to place order",
        variant: "destructive",
      });
    },
  });

  if (cart.items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Your Cart</CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground mb-4">Your cart is empty</p>
            <Link href="/marketplace">
              <Button>Continue Shopping</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return Number(price).toFixed(2);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-24 w-24 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium">{item.title}</h3>
                    <p className="text-muted-foreground">£{formatPrice(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        if (item.quantity > 1) {
                          cart.updateQuantity(item.id, item.quantity - 1);
                        }
                      }}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => cart.removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>£{formatPrice(subtotal)}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>£{formatPrice(selectedShipping?.price || 0)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Package Details:</p>
                    <p>Total Weight: {(totalWeight/1000).toFixed(2)}kg</p>
                    <p>Total Size: {totalSize}cm</p>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span>£{formatPrice(total)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={() => setCheckoutOpen(true)}
              >
                Proceed to Checkout
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((data) => checkoutMutation.mutate(data))} className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                {...form.register("fullName")}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...form.register("email")}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                {...form.register("phone")}
                required
              />
            </div>
            <div>
              <Label htmlFor="address">Delivery Address</Label>
              <Input
                id="address"
                {...form.register("address")}
                required
              />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                {...form.register("city")}
                required
              />
            </div>
            <div>
              <Label htmlFor="postcode">Postcode (UK only)</Label>
              <Input
                id="postcode"
                {...form.register("postcode", {
                  required: "Postcode is required",
                  validate: {
                    ukOnly: (value) =>
                      isValidUKPostcode(value) || "Please enter a valid UK postcode",
                  },
                })}
                placeholder="e.g. SW1A 1AA"
                onChange={(e) => {
                  const formattedPostcode = formatUKPostcode(e.target.value);
                  e.target.value = formattedPostcode;
                  updateShippingOptions(formattedPostcode);
                }}
              />
              {form.formState.errors.postcode && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.postcode.message}
                </p>
              )}
            </div>

            {shippingOptions.length > 0 && (
              <div>
                <Label>Shipping Method</Label>
                <Select
                  value={selectedShipping ? `${selectedShipping.provider}|${selectedShipping.speed}` : ''}
                  onValueChange={(value) => {
                    if (!value) return;
                    const [provider, speed] = value.split('|');
                    const option = shippingOptions.find(
                      opt => opt.provider === provider && opt.speed === speed
                    );
                    if (option) {
                      setSelectedShipping(option);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select shipping method" />
                  </SelectTrigger>
                  <SelectContent>
                    {shippingOptions.map((option) => (
                      <SelectItem
                        key={`${option.provider}|${option.speed}`}
                        value={`${option.provider}|${option.speed}`}
                      >
                        {option.provider} - {option.speed} (£{formatPrice(option.price)}) - {option.estimatedDays}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={checkoutMutation.isPending || !selectedShipping}
            >
              {checkoutMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay £${formatPrice(total)}`
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}