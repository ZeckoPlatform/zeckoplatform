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
import { Loader2, Eye, MessageSquare } from "lucide-react";
import { format } from "date-fns";

const ORDER_STATUSES = {
  pending: "bg-yellow-500",
  processing: "bg-blue-500",
  shipped: "bg-purple-500",
  delivered: "bg-green-500",
  cancelled: "bg-red-500",
  refunded: "bg-gray-500",
};

export default function OrderManagement() {
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [message, setMessage] = useState("");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["/api/vendor/orders"],
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }) => {
      const response = await apiRequest("PATCH", `/api/vendor/orders/${orderId}/status`, {
        status,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/orders"] });
      toast({ title: "Success", description: "Order status updated successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ orderId, message }) => {
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
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (orderId, status) => {
    updateOrderStatusMutation.mutate({ orderId, status });
  };

  const handleSendMessage = (orderId) => {
    if (!message.trim()) return;
    sendMessageMutation.mutate({ orderId, message });
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
                          <Badge className={ORDER_STATUSES[order.status]}>
                            {order.status}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(ORDER_STATUSES).map((status) => (
                          <SelectItem key={status} value={status}>
                            <Badge className={ORDER_STATUSES[status]}>
                              {status}
                            </Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                                  <TableHead>Quantity</TableHead>
                                  <TableHead>Price</TableHead>
                                  <TableHead>Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {order.items.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell>{item.product.name}</TableCell>
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
                              disabled={!message.trim()}
                            >
                              Send Message
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
