import { useState } from 'react';
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store, Package, Settings, Edit, Trash2 } from "lucide-react";

export default function VendorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const { data: products } = useQuery({
    queryKey: ["/api/products"],
    select: (data) => data.filter((product) => product.vendorId === user?.id),
  });

  const productForm = useForm({
    defaultValues: {
      title: "",
      description: "",
      price: "",
      category: "",
      imageUrl: "",
    },
  });

  const editForm = useForm({
    defaultValues: {
      title: "",
      description: "",
      price: "",
      category: "",
      imageUrl: "",
    },
  });

  const profileForm = useForm({
    defaultValues: {
      name: user?.profile?.name || "",
      description: user?.profile?.description || "",
      categories: user?.profile?.categories?.join(", ") || "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      const res = await apiRequest("PATCH", "/api/user/profile", {
        profile: {
          ...user?.profile,
          name: data.name?.trim(),
          description: data.description?.trim(),
          categories: data.categories?.split(",").map(c => c.trim()).filter(Boolean),
        },
      });
      return res.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({
        title: "Success",
        description: "Store profile updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (data) => {
      const price = parseFloat(data.price);
      if (isNaN(price) || price <= 0) {
        throw new Error("Please enter a valid positive number for the price.");
      }

      const res = await apiRequest("POST", "/api/products", {
        ...data,
        price: price.toFixed(2),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Product created successfully",
      });
      productForm.reset();
      setDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create product",
        variant: "destructive",
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const price = parseFloat(data.price);
      if (isNaN(price) || price <= 0) {
        throw new Error("Please enter a valid positive number for the price.");
      }

      const res = await apiRequest("PATCH", `/api/products/${id}`, {
        ...data,
        price: price.toFixed(2),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
      setEditingProduct(null);
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id) => {
      await apiRequest("DELETE", `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    },
  });

  if (user?.userType !== "vendor") {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This dashboard is only available for vendor accounts.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Vendor Dashboard</h1>

      <Tabs defaultValue="products">
        <TabsList className="mb-8">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Products
          </TabsTrigger>
          <TabsTrigger value="store" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Store Profile
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">My Products</h2>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>Add Product</Button>
              </DialogTrigger>
              <DialogContent aria-describedby="dialog-description">
                <DialogHeader>
                  <DialogTitle>Add New Product</DialogTitle>
                  <DialogDescription id="dialog-description">
                    Fill in the details below to add a new product to your store.
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={productForm.handleSubmit((data) =>
                    createProductMutation.mutate(data)
                  )}
                  className="space-y-4"
                >
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" {...productForm.register("title")} required />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      {...productForm.register("description")}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Price ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      {...productForm.register("price")}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      {...productForm.register("category")}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="imageUrl">Image URL</Label>
                    <Input
                      id="imageUrl"
                      {...productForm.register("imageUrl")}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    List Product
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            {/* Edit Product Dialog */}
            <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
              <DialogContent aria-describedby="edit-dialog-description">
                <DialogHeader>
                  <DialogTitle>Edit Product</DialogTitle>
                  <DialogDescription id="edit-dialog-description">
                    Update your product details below.
                  </DialogDescription>
                </DialogHeader>
                {editingProduct && (
                  <form
                    onSubmit={editForm.handleSubmit((data) =>
                      updateProductMutation.mutate({ id: editingProduct.id, data })
                    )}
                    className="space-y-4"
                  >
                    <div>
                      <Label htmlFor="edit-title">Title</Label>
                      <Input id="edit-title" {...editForm.register("title")} required />
                    </div>
                    <div>
                      <Label htmlFor="edit-description">Description</Label>
                      <Textarea
                        id="edit-description"
                        {...editForm.register("description")}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-price">Price ($)</Label>
                      <Input
                        id="edit-price"
                        type="number"
                        step="0.01"
                        min="0"
                        {...editForm.register("price")}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-category">Category</Label>
                      <Input
                        id="edit-category"
                        {...editForm.register("category")}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-imageUrl">Image URL</Label>
                      <Input
                        id="edit-imageUrl"
                        {...editForm.register("imageUrl")}
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Save Changes
                    </Button>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products?.map((product) => (
              <Card key={product.id}>
                <div className="aspect-square relative">
                  <img
                    src={product.imageUrl || "https://images.unsplash.com/photo-1518302057166-c990a3585cc3"}
                    alt={product.title}
                    className="absolute inset-0 w-full h-full object-cover rounded-t-lg"
                  />
                </div>
                <CardHeader>
                  <CardTitle className="line-clamp-2">{product.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-3 mb-4">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">
                      ${parseFloat(product.price).toFixed(2)}
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
                    onClick={() => {
                      editForm.reset(product);
                      setEditingProduct(product);
                    }}
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
          {(!products || products.length === 0) && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  You haven't added any products yet. Click the "Add Product" button to get started.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="store">
          <Card>
            <CardHeader>
              <CardTitle>Store Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={profileForm.handleSubmit((data) =>
                  updateProfileMutation.mutate(data)
                )}
                className="space-y-4 max-w-2xl"
              >
                <div>
                  <Label htmlFor="name">Store Name</Label>
                  <Input id="name" {...profileForm.register("name")} required />
                </div>
                <div>
                  <Label htmlFor="description">Store Description</Label>
                  <Textarea
                    id="description"
                    {...profileForm.register("description")}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="categories">
                    Categories (comma-separated)
                  </Label>
                  <Input
                    id="categories"
                    {...profileForm.register("categories")}
                    placeholder="Electronics, Accessories, Home Decor"
                    required
                  />
                </div>
                <Button type="submit">Save Profile</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Subscription Status</h3>
                  <p className="text-sm text-muted-foreground">
                    Your vendor subscription is {user.subscriptionActive ? "active" : "inactive"}
                  </p>
                </div>
                <Button variant="outline" asChild>
                  <a href="/subscription">Manage Subscription</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}