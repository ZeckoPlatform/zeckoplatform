import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store, Package, Settings, Edit, Trash2, Loader2, Upload, AlertCircle, CheckCircle2, Star } from "lucide-react";
import { ProductForm } from "@/components/ProductForm";
import { UserReviews } from "@/components/reviews/UserReviews";
import { format } from 'date-fns'
import { ReviewsTab } from "@/components/reviews/ReviewsTab";
import { useLocation } from 'wouter';


interface Product {
  id: number;
  title: string;
  description: string;
  price: number | string;
  category: string;
  imageUrl?: string;
  vendorId: number;
}

interface EditProductFormData {
  title: string;
  description: string;
  price: number | string;
  category: string;
  imageUrl?: string;
}

interface StripeAccountStatus {
  status: "enabled" | "pending" | "disabled";
  details: {
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
  };
}

// Placeholder for SubscriptionRequiredModal -  You'll need to create this component
const SubscriptionRequiredModal = ({ isOpen, onClose, userType }: { isOpen: boolean; onClose: () => void; userType: string }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upgrade Your Plan</DialogTitle>
          <DialogDescription>
            To access {userType === 'vendor' ? 'Vendor' : 'Customer'} features, please upgrade your subscription.
          </DialogDescription>
        </DialogHeader>
        <Button onClick={onClose}>Close</Button> {/*  Add actual upgrade logic here */}
      </DialogContent>
    </Dialog>
  );
};


export default function VendorDashboard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [, setLocation] = useLocation();

  const isFeatureAvailable = (feature: 'payments' | 'analytics' | 'advanced_reviews') => {
    return user?.subscriptionActive || feature === 'basic';
  };

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    select: (data) => {
      console.log("Products data:", data);
      return Array.isArray(data)
        ? data.filter((product) => product.vendorId === user?.id)
        : [];
    },
    enabled: !!user?.id,
  });

  const editForm = useForm<EditProductFormData>();
  const accountForm = useForm({
    defaultValues: {
      username: user?.username || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      const reader = new FileReader();

      reader.onloadend = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const response = await apiRequest("POST", "/api/upload", {
            file: base64Data,
            fileName: file.name,
          });
          const data = await response.json();

          if (!data.url) {
            throw new Error("Image upload failed");
          }

          editForm.setValue("imageUrl", data.url);
          setPreviewUrl(URL.createObjectURL(file));

          toast({
            title: "Success",
            description: "Image uploaded successfully",
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to upload image. Please try again.",
            variant: "destructive",
          });
        } finally {
          setUploading(false);
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process image. Please try again.",
        variant: "destructive",
      });
      setUploading(false);
    }
  };

  useEffect(() => {
    if (editingProduct) {
      editForm.reset({
        title: editingProduct.title,
        description: editingProduct.description,
        price: editingProduct.price,
        category: editingProduct.category,
        imageUrl: editingProduct.imageUrl,
      });
      setPreviewUrl(editingProduct.imageUrl);
    } else {
      editForm.reset();
      setPreviewUrl(undefined);
    }
  }, [editingProduct, editForm]);

  const updateAccountMutation = useMutation({
    mutationFn: async (data: {
      username: string;
      currentPassword: string;
      newPassword: string;
    }) => {
      const res = await apiRequest("PATCH", "/api/user", data);
      if (!res.ok) {
        throw new Error("Failed to update account");
      }
      return res.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({
        title: "Success",
        description: "Account updated successfully",
      });
      accountForm.reset({
        username: updatedUser.username,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update account",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUpdating(false);
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EditProductFormData }) => {
      const res = await apiRequest("PATCH", `/api/products/${id}`, data);
      if (!res.ok) {
        throw new Error("Failed to update product");
      }
      return res.json();
    },
    onSuccess: (updatedProduct) => {
      queryClient.setQueryData<Product[]>(
        ["/api/products"],
        (old = []) => old.map(p => p.id === updatedProduct.id ? updatedProduct : p)
      );
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
      setEditingProduct(null);
      setPreviewUrl(undefined);
      editForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update product",
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/products/${id}`);
      if (!res.ok) {
        throw new Error("Failed to delete product");
      }
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<Product[]>(
        ["/api/products"],
        (old = []) => old.filter((p) => p.id !== deletedId)
      );
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive",
      });
    },
  });

  const { data: accountStatus, isLoading: statusLoading } = useQuery<StripeAccountStatus>({
    queryKey: ["/api/vendor/stripe/account/status"],
    enabled: user?.stripeAccountId !== undefined,
  });

  const setupAccountMutation = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      const response = await apiRequest("POST", "/api/vendor/stripe/account", {
        email: user?.username,
      });
      if (!response.ok) {
        throw new Error("Failed to create Stripe account");
      }
      const data = await response.json();
      window.location.href = data.onboardingUrl;
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    },
  });

  const getStatusBadge = () => {
    if (statusLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (!accountStatus) return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    return accountStatus?.status === "enabled" ? (
      <CheckCircle2 className="h-4 w-4 text-green-500" />
    ) : (
      <AlertCircle className="h-4 w-4 text-yellow-500" />
    );
  };

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['/api/vendor/balance'],
    enabled: !!user?.id,
  })

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['/api/vendor/transactions'],
    enabled: !!user?.id,
  })

  const syncTransactionsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/vendor/transactions/sync')
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/vendor/transactions'])
    }
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Vendor Dashboard</h1>

      {!user?.subscriptionActive && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertCircle className="h-5 w-5" />
            <p>
              You are using a free vendor account.
              <Button
                variant="link"
                className="text-yellow-800 underline"
                onClick={() => setShowSubscriptionModal(true)}
              >
                Upgrade to access all features
              </Button>
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="products">
        <TabsList className="mb-8">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Products
          </TabsTrigger>
          <TabsTrigger value="reviews" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Reviews
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          {isFeatureAvailable('payments') && (
            <>
              <TabsTrigger value="store" className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                Store Profile
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                Payments Setup
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="products">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">My Products</h2>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>Add Product</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Product</DialogTitle>
                  <DialogDescription>
                    Fill in the details below to add a new product to your store.
                  </DialogDescription>
                </DialogHeader>
                <ProductForm onSuccess={() => setDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products?.map((product) => (
              <Card key={product.id}>
                <div className="aspect-square relative">
                  <img
                    src={product.imageUrl || "https://via.placeholder.com/400"}
                    alt={product.title}
                    className="absolute inset-0 w-full h-full object-cover rounded-t-lg"
                  />
                </div>
                <CardHeader>
                  <CardTitle className="line-clamp-2">{product.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-3">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-lg font-semibold">
                      £{typeof product.price === 'string' ? parseFloat(product.price).toFixed(2) : product.price.toFixed(2)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {product.category}
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setEditingProduct(product)}
                  >
                    <Edit className="h-4 w-4 mr-2" /> Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this product?')) {
                        deleteProductMutation.mutate(product.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Product</DialogTitle>
                <DialogDescription>
                  Update your product details below.
                </DialogDescription>
              </DialogHeader>
              {editingProduct && (
                <form
                  onSubmit={editForm.handleSubmit((data) =>
                    updateProductMutation.mutate({
                      id: editingProduct.id,
                      data: {
                        ...data,
                        price: typeof data.price === 'string' ? parseFloat(data.price) : data.price,
                      },
                    })
                  )}
                  className="space-y-4"
                >
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" {...editForm.register("title")} required />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      {...editForm.register("description")}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Price (£)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      {...editForm.register("price", {
                        valueAsNumber: true,
                      })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      {...editForm.register("category")}
                      required
                    />
                  </div>

                  <div className="space-y-4">
                    <Label>Product Image</Label>
                    <div className="flex flex-col gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-32 flex flex-col items-center justify-center gap-2 border-2 border-dashed"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-8 w-8 text-primary" />
                            <span>Click to upload image</span>
                            <span className="text-xs text-muted-foreground">
                              PNG, JPG up to 10MB
                            </span>
                          </>
                        )}
                      </Button>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={uploading}
                      />

                      {previewUrl && (
                        <div className="relative w-full h-48">
                          <img
                            src={previewUrl}
                            alt="Product preview"
                            className="w-full h-full object-contain rounded-lg border"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={updateProductMutation.isPending || uploading}
                  >
                    {updateProductMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving Changes...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="reviews">
          <ReviewsTab />
        </TabsContent>

        <TabsContent value="settings">
          <div className="grid gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>
                  Update your account details and password
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-4"
                  onSubmit={accountForm.handleSubmit((data) => {
                    if (data.newPassword !== accountForm.getValues("confirmPassword")) {
                      toast({
                        title: "Error",
                        description: "New passwords do not match",
                        variant: "destructive",
                      });
                      return;
                    }
                    setIsUpdating(true);
                    updateAccountMutation.mutate({
                      username: data.username,
                      currentPassword: data.currentPassword,
                      newPassword: data.newPassword,
                    });
                  })}
                >
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      {...accountForm.register("username")}
                      placeholder="Your username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      {...accountForm.register("currentPassword")}
                      placeholder="Enter current password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      {...accountForm.register("newPassword")}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      {...accountForm.register("confirmPassword")}
                      placeholder="Confirm new password"
                    />
                  </div>
                  <Button type="submit" disabled={isUpdating}>
                    {isUpdating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Account'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Subscription Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Subscription Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <h3 className="font-medium mb-2">Current Plan</h3>
                  <p className="text-sm text-muted-foreground">
                    {user?.subscriptionActive ? (
                      <>
                        Your vendor subscription is active
                        {user?.subscriptionEndsAt && (
                          <> until {format(new Date(user.subscriptionEndsAt), "PP")}</>
                        )}
                      </>
                    ) : (
                      "Your vendor subscription is inactive"
                    )}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setLocation('/subscription');
                  }}
                >
                  Manage Subscription
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {isFeatureAvailable('payments') && (
          <>
            <TabsContent value="store">
              <Card>
                <CardHeader>
                  <CardTitle>Store Profile</CardTitle>
                  <CardDescription>
                    Manage your store details and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4">
                    <div>
                      <Label htmlFor="store-name">Store Name</Label>
                      <Input
                        id="store-name"
                        placeholder="Enter your store name"
                        defaultValue={user?.storeName}
                      />
                    </div>
                    <div>
                      <Label htmlFor="store-description">Store Description</Label>
                      <Textarea
                        id="store-description"
                        placeholder="Describe your store"
                        defaultValue={user?.storeDescription}
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact-email">Contact Email</Label>
                      <Input
                        id="contact-email"
                        type="email"
                        placeholder="contact@example.com"
                        defaultValue={user?.contactEmail}
                      />
                    </div>
                    <div>
                      <Label htmlFor="business-address">Business Address</Label>
                      <Textarea
                        id="business-address"
                        placeholder="Enter your business address"
                        defaultValue={user?.businessAddress}
                      />
                    </div>
                    <Button type="submit">Save Changes</Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments">
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Payment Account Status {getStatusBadge()}
                  </CardTitle>
                  <CardDescription>
                    Set up your Stripe account to receive payments from customers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!user?.stripeAccountId ? (
                    <div>
                      <p className="mb-4">
                        You haven't set up your payment account yet. Set up Stripe to start
                        receiving payments for your products.
                      </p>
                      <Button
                        onClick={() => setupAccountMutation.mutate()}
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
                  ) : accountStatus?.status === "enabled" ? (
                    <>
                      <div className="space-y-2 mb-6">
                        <p className="text-green-600 font-medium">
                          Your Stripe account is fully set up and ready to receive payments!
                        </p>
                        <dl className="space-y-1">
                          <div className="flex gap-2">
                            <dt className="font-medium">Charges Enabled:</dt>
                            <dd>{accountStatus.details.chargesEnabled ? "Yes" : "No"}</dd>
                          </div>
                          <div className="flex gap-2">
                            <dt className="font-medium">Payouts Enabled:</dt>
                            <dd>{accountStatus.details.payoutsEnabled ? "Yes" : "No"}</dd>
                          </div>
                        </dl>
                      </div>

                      {/* Balance section */}
                      {balance && (
                        <div className="space-y-4 mb-6">
                          <h3 className="font-semibold">Current Balance</h3>
                          <div>
                            <p className="text-sm text-muted-foreground">Available</p>
                            <p className="text-2xl font-bold">
                              £{((balance.available?.[0]?.amount || 0) / 100).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Pending</p>
                            <p className="text-xl">
                              £{((balance.pending?.[0]?.amount || 0) / 100).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Transactions section */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="font-semibold">Recent Transactions</h3>
                          <Button
                            variant="outline"
                            onClick={() => syncTransactionsMutation.mutate()}
                            disabled={syncTransactionsMutation.isPending}
                          >
                            {syncTransactionsMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Sync Transactions"
                            )}
                          </Button>
                        </div>

                        {transactionsLoading ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                          </div>
                        ) : transactions.length > 0 ? (
                          <div className="space-y-4">
                            {transactions.map((transaction: any) => (
                              <div
                                key={transaction.id}
                                className="flex justify-between items-center p-4 border rounded-lg"
                              >
                                <div>
                                  <p className="font-medium">
                                    Transfer #{transaction.stripe_transfer_id}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {format(new Date(transaction.created_at), "PPP")}
                                  </p>
                                  <p className="text-sm">
                                    Amount: £{(transaction.amount / 100).toFixed(2)}
                                  </p>
                                  <p className="text-sm capitalize">Status: {transaction.status}</p>
                                </div>
                                {transaction.product_details && (
                                  <div className="text-sm text-muted-foreground">
                                    <p>Product: {transaction.product_details.name}</p>
                                    <p>Quantity: {transaction.product_details.quantity}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center py-8 text-muted-foreground">
                            No transactions found
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div>
                      <p className="text-yellow-600 mb-4">
                        Your Stripe account setup is pending. Please complete the
                        onboarding process to start receiving payments.
                      </p>
                      <Button
                        onClick={() => setupAccountMutation.mutate()}
                        disabled={isLoading}
                      >
                        Complete Stripe Setup
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>

      {showSubscriptionModal && (
        <SubscriptionRequiredModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          userType="vendor"
        />
      )}
    </div>
  );
}