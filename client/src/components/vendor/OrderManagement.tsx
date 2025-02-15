import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Eye, MessageSquare, Printer, Truck } from "lucide-react";
import { format } from "date-fns";

interface OrderStatus {
  value: string;
  label: string;
  color: string;
}

const ORDER_STATUSES: OrderStatus[] = [
  { value: "pending", label: "Pending", color: "bg-yellow-500" },
  { value: "processing", label: "Processing", color: "bg-blue-500" },
  { value: "shipped", label: "Shipped", color: "bg-purple-500" },
  { value: "delivered", label: "Delivered", color: "bg-green-500" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-500" },
  { value: "refunded", label: "Refunded", color: "bg-gray-500" },
];

type ShippingLabel = {
  id: string;
  trackingNumber: string;
  carrier: string;
  url: string;
};

interface Order {
  id: number;
  createdAt: string;
  status: string;
  totalAmount: number;
  items: Array<{
    id: number;
    product: {
      name: string;
      sku: string;
    };
    quantity: number;
    pricePerUnit: number;
    totalPrice: number;
  }>;
  shippingAddress: {
    fullName: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  billingAddress: {
    companyName?: string;
    vatNumber?: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  specialInstructions?: string;
  shippingLabel?: ShippingLabel;
}

export default function OrderManagement() {
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [message, setMessage] = useState("");

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["/api/vendor/orders"],
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/vendor/orders/${orderId}/status`, {
        status,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/orders"] });
      toast({ title: "Success", description: "Order status updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ orderId, message }: { orderId: number; message: string }) => {
      const response = await apiRequest("POST", `/api/vendor/orders/${orderId}/messages`, {
        message,
      });
      return response.json();
    },
    onSuccess: () => {
      setMessage("");
      setIsMessageOpen(false);
      toast({ title: "Success", description: "Message sent successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateShippingLabelMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await apiRequest("POST", `/api/vendor/orders/${orderId}/shipping-label`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/orders"] });
      toast({ 
        title: "Success", 
        description: "Shipping label generated successfully. Tracking number: " + data.trackingNumber 
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateInvoiceMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await apiRequest("POST", `/api/vendor/orders/${orderId}/invoice`);
      return response.json();
    },
    onSuccess: (data) => {
      // Open invoice PDF in new window
      window.open(data.invoiceUrl, '_blank');
      toast({ title: "Success", description: "Invoice generated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (orderId: number, status: string) => {
    updateOrderStatusMutation.mutate({ orderId, status });
  };

  const handleSendMessage = (orderId: number) => {
    if (!message.trim()) return;
    sendMessageMutation.mutate({ orderId, message });
  };

  const handleGenerateShippingLabel = (orderId: number) => {
    generateShippingLabelMutation.mutate(orderId);
  };

  const handleGenerateInvoice = (orderId: number) => {
    generateInvoiceMutation.mutate(orderId);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Shipping</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders?.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>#{order.id}</TableCell>
                  <TableCell>
                    {format(new Date(order.createdAt), "PP")}
                  </TableCell>
                  <TableCell>
                    {order.shippingAddress.fullName}
                  </TableCell>
                  <TableCell>
                    £{(order.totalAmount / 100).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={order.status}
                      onValueChange={(status) => handleStatusChange(order.id, status)}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue>
                          <Badge 
                            className={ORDER_STATUSES.find(s => s.value === order.status)?.color}
                          >
                            {order.status}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            <Badge className={status.color}>
                              {status.label}
                            </Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {order.shippingLabel ? (
                      <a
                        href={order.shippingLabel.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {order.shippingLabel.trackingNumber}
                      </a>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateShippingLabel(order.id)}
                        disabled={generateShippingLabelMutation.isPending}
                      >
                        <Truck className="h-4 w-4 mr-2" />
                        Generate Label
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsDetailsOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Order Details #{order.id}</DialogTitle>
                          </DialogHeader>
                          <div className="grid grid-cols-2 gap-8">
                            <div>
                              <h3 className="font-semibold mb-2">Shipping Address</h3>
                              <p>{order.shippingAddress.fullName}</p>
                              <p>{order.shippingAddress.street}</p>
                              <p>
                                {order.shippingAddress.city}, {order.shippingAddress.state}
                              </p>
                              <p>{order.shippingAddress.postalCode}</p>
                              <p>{order.shippingAddress.country}</p>
                              <p>Phone: {order.shippingAddress.phone}</p>
                            </div>
                            <div>
                              <h3 className="font-semibold mb-2">Billing Address</h3>
                              {order.billingAddress.companyName && (
                                <p>{order.billingAddress.companyName}</p>
                              )}
                              {order.billingAddress.vatNumber && (
                                <p>VAT: {order.billingAddress.vatNumber}</p>
                              )}
                              <p>{order.billingAddress.street}</p>
                              <p>
                                {order.billingAddress.city}, {order.billingAddress.state}
                              </p>
                              <p>{order.billingAddress.postalCode}</p>
                              <p>{order.billingAddress.country}</p>
                            </div>
                          </div>
                          <div className="mt-6">
                            <h3 className="font-semibold mb-2">Order Items</h3>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Product</TableHead>
                                  <TableHead>SKU</TableHead>
                                  <TableHead>Quantity</TableHead>
                                  <TableHead>Price</TableHead>
                                  <TableHead>Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {order.items.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell>{item.product.name}</TableCell>
                                    <TableCell>{item.product.sku}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell>
                                      £{(item.pricePerUnit / 100).toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                      £{(item.totalPrice / 100).toFixed(2)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                          {order.specialInstructions && (
                            <div className="mt-6">
                              <h3 className="font-semibold mb-2">Special Instructions</h3>
                              <p>{order.specialInstructions}</p>
                            </div>
                          )}
                          <div className="mt-6 flex justify-end space-x-4">
                            <Button
                              variant="outline"
                              onClick={() => handleGenerateInvoice(order.id)}
                              disabled={generateInvoiceMutation.isPending}
                            >
                              <Printer className="h-4 w-4 mr-2" />
                              Generate Invoice
                            </Button>
                            {!order.shippingLabel && (
                              <Button
                                onClick={() => handleGenerateShippingLabel(order.id)}
                                disabled={generateShippingLabelMutation.isPending}
                              >
                                <Truck className="h-4 w-4 mr-2" />
                                Generate Shipping Label
                              </Button>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsMessageOpen(true);
                            }}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Message Customer</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Textarea
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              placeholder="Type your message here..."
                              rows={4}
                            />
                            <Button
                              onClick={() => handleSendMessage(order.id)}
                              disabled={!message.trim() || sendMessageMutation.isPending}
                            >
                              {sendMessageMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                'Send Message'
                              )}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}