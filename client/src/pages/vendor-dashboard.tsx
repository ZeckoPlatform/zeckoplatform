import { useState, useEffect, useRef } from 'react';
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
import { Store, Package, Settings, Edit, Trash2, Upload, Loader2 } from "lucide-react";
import { ProductForm } from "@/components/ProductForm";

export default function VendorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
    select: (data) => data?.filter((product) => product.vendorId === user?.id),
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

  // Re-add updateProfileMutation
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

  useEffect(() => {
    if (editingProduct) {
      const price = typeof editingProduct.price === 'string' 
        ? parseFloat(editingProduct.price) 
        : editingProduct.price;

      editForm.reset({
        title: editingProduct.title,
        description: editingProduct.description,
        price: price.toFixed(2),
        category: editingProduct.category,
        imageUrl: editingProduct.imageUrl,
      });
      setPreviewUrl(editingProduct.imageUrl);
    }
  }, [editingProduct, editForm]);

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

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const price = parseFloat(data.price);
      if (isNaN(price) || price <= 0) {
        throw new Error("Please enter a valid positive number for the price.");
      }

      const res = await apiRequest("PATCH", `/api/products/${id}`, {
        ...data,
        price: price.toFixed(2), // Send price as dollars
      });

      if (!res.ok) {
        throw new Error("Failed to update product");
      }

      const updatedProduct = await res.json();
      return updatedProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
      setEditingProduct(null);
      setPreviewUrl(undefined);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update product",
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id) => {
      const res = await apiRequest("DELETE", `/api/products/${id}`);
      if (!res.ok) {
        throw new Error("Failed to delete product");
      }
      return id;
    },
    onSuccess: (deletedId) => {
      // Optimistically remove the product from the cache
      const currentProducts = queryClient.getQueryData(["/api/products"]) || [];
      queryClient.setQueryData(
        ["/api/products"],
        currentProducts.filter(p => p.id !== deletedId)
      );

      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive",
      });
      // Refresh the products list on error to ensure sync
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
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
              <DialogContent className="max-h-[85vh] overflow-y-auto" aria-describedby="dialog-description">
                <DialogHeader>
                  <DialogTitle>Add New Product</DialogTitle>
                  <DialogDescription id="dialog-description">
                    Fill in the details below to add a new product to your store.
                  </DialogDescription>
                </DialogHeader>
                <ProductForm onSuccess={() => setDialogOpen(false)} />
              </DialogContent>
            </Dialog>

            {/* Edit Product Dialog */}
            <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
              <DialogContent className="max-h-[85vh] overflow-y-auto" aria-describedby="edit-dialog-description">
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
                        placeholder="0.00"
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
                                PNG, JPG, GIF up to 10MB
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
                <Button type="submit" disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Profile'
                  )}
                </Button>
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
              <div>
                <h3 className="font-medium mb-2">Subscription Status</h3>
                <p className="text-sm text-muted-foreground">
                  Your vendor subscription is {user?.subscriptionActive ? "active" : "inactive"}
                </p>
              </div>
              <Button variant="outline" asChild className="mt-4">
                <a href="/subscription">Manage Subscription</a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}