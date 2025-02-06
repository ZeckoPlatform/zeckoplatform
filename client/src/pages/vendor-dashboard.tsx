import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
import { Store, Package, Settings, Edit, Trash2, Loader2, Upload } from "lucide-react";
import { ProductForm } from "@/components/ProductForm";

interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  vendorId: number;
}

interface EditProductFormData {
  title: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
}

export default function VendorDashboard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    select: (data) =>
      Array.isArray(data)
        ? data.filter((product) => product.vendorId === user?.id)
        : [],
    enabled: !!user?.id,
  });

  const editForm = useForm<EditProductFormData>();

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
        price: Number(editingProduct.price),
        category: editingProduct.category,
        imageUrl: editingProduct.imageUrl,
      });
      setPreviewUrl(editingProduct.imageUrl);
    } else {
      editForm.reset();
      setPreviewUrl(undefined);
    }
  }, [editingProduct, editForm]);

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EditProductFormData }) => {
      const price = Number(data.price);
      if (isNaN(price) || price <= 0) {
        throw new Error("Please enter a valid positive number for the price.");
      }

      const res = await apiRequest("PATCH", `/api/products/${id}`, {
        ...data,
        price: price.toFixed(2), // Send price as string with 2 decimal places
      });

      if (!res.ok) {
        throw new Error("Failed to update product");
      }

      return res.json();
    },
    onSuccess: (updatedProduct) => {
      queryClient.setQueryData<Product[]>(
        ["/api/products"],
        (old = []) => old?.map(p => p.id === updatedProduct.id ? updatedProduct : p) ?? []
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
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });

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
              <DialogContent className="max-h-[85vh] overflow-y-auto" aria-describedby="add-product-description">
                <DialogHeader>
                  <DialogTitle>Add New Product</DialogTitle>
                  <DialogDescription id="add-product-description">
                    Fill in the details below to add a new product to your store.
                  </DialogDescription>
                </DialogHeader>
                <ProductForm onSuccess={() => setDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>

          <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
            <DialogContent className="max-h-[85vh] overflow-y-auto" aria-describedby="edit-product-description">
              <DialogHeader>
                <DialogTitle>Edit Product</DialogTitle>
                <DialogDescription id="edit-product-description">
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
                        price: Number(data.price).toFixed(2), // Ensure price is sent with 2 decimal places
                        imageUrl: editForm.getValues("imageUrl"),
                      },
                    })
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
                      {...editForm.register("price", {
                        valueAsNumber: true,
                        validate: (value) => value > 0 || "Price must be greater than 0",
                      })}
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
                  <p className="text-muted-foreground line-clamp-3">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-lg font-semibold">
                      ${Number(product.price).toFixed(2)}
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
            {(!products || products.length === 0) && (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    You haven't added any products yet. Click the "Add Product" button to get started.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="store">
          <Card>
            <CardHeader>
              <CardTitle>Store Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Store profile management features coming soon.
              </p>
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