import { useState } from "react";
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
import { Search, Mail, Phone, Loader2 } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { Heart, ShoppingCart } from "lucide-react";

interface ProductVariation {
  id: number;
  attributes: Record<string, string>;
  price: number;
  stock: number;
  sku: string;
}

interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  shippingOverride?: number;
  vendor: {
    name: string;
    email: string;
    phone?: string;
    id: number;
  };
  variations?: ProductVariation[];
  attributes?: {
    name: string;
    values: string[];
  }[];
  reviews?: {
    id: number;
    rating: number;
    comment: string;
    userName: string;
    createdAt: string;
  }[];
  averageRating?: number;
  stock: number;
  sku?: string;
  tags?: string[];
}

export default function MarketplacePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const cart = useCart(); 
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const form = useForm({
    defaultValues: {
      title: "",
      description: "",
      price: "",
      category: "",
      imageUrl: "",
      weight: "",
      length: "",
      width: "",
      height: "",
      shippingOverride: "",
    },
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/products", {
        ...data,
        price: parseFloat(data.price),
        weight: parseFloat(data.weight),
        dimensions: {
          length: parseFloat(data.length),
          width: parseFloat(data.width),
          height: parseFloat(data.height),
        },
        shippingOverride: data.shippingOverride ? parseFloat(data.shippingOverride) : undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Product Created",
        description: "Your product has been listed successfully.",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create product",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1495522097160-b7d527cc67f8"
            alt="Zecko marketplace items"
            className="w-full h-64 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-background/50" />
        </div>

        <div className="relative max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Zecko Marketplace
          </h1>
          <div className="max-w-xl">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Search products..." 
                  className="pl-10"
                />
              </div>
              {user?.userType === "vendor" && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>Add Product</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Product</DialogTitle>
                      <DialogDescription>
                        Fill in the details below to add a new product to the Zecko marketplace.
                      </DialogDescription>
                    </DialogHeader>
                    <form
                      onSubmit={form.handleSubmit((data) =>
                        createProductMutation.mutate(data)
                      )}
                      className="space-y-4"
                    >
                      <div>
                        <Label htmlFor="title">Title</Label>
                        <Input id="title" {...form.register("title")} required />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          {...form.register("description")}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="price">Price (£)</Label>
                        <Input
                          id="price"
                          type="text"
                          pattern="^\d*\.?\d{0,2}$"
                          inputMode="decimal"
                          placeholder="0.00"
                          {...form.register("price")}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Input
                          id="category"
                          {...form.register("category")}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="imageUrl">Image URL</Label>
                        <Input
                          id="imageUrl"
                          {...form.register("imageUrl")}
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="weight">Weight (grams)</Label>
                          <Input
                            id="weight"
                            type="number"
                            {...form.register("weight")}
                            placeholder="e.g., 500"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="length">Length (cm)</Label>
                            <Input
                              id="length"
                              type="number"
                              {...form.register("length")}
                              placeholder="e.g., 20"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="width">Width (cm)</Label>
                            <Input
                              id="width"
                              type="number"
                              {...form.register("width")}
                              placeholder="e.g., 15"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="height">Height (cm)</Label>
                            <Input
                              id="height"
                              type="number"
                              {...form.register("height")}
                              placeholder="e.g., 10"
                              required
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="shippingOverride">Custom Shipping Price (Optional)</Label>
                        <Input
                          id="shippingOverride"
                          type="number"
                          step="0.01"
                          {...form.register("shippingOverride")}
                          placeholder="Leave empty for calculated shipping"
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Set a fixed shipping price or leave empty to use our calculated rates
                        </p>
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={createProductMutation.isPending}
                      >
                        {createProductMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'List Product'
                        )}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                <p className="text-muted-foreground line-clamp-3 text-sm mb-4">
                  {product.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">
                    £{parseFloat(product.price).toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {product.category}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="grid grid-cols-2 gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" onClick={() => setSelectedProduct(product)}>
                      View Details
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{selectedProduct?.title}</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="aspect-square relative rounded-lg overflow-hidden">
                        <img
                          src={selectedProduct?.imageUrl || "https://images.unsplash.com/photo-1518302057166-c990a3585cc3"}
                          alt={selectedProduct?.title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      </div>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Description</h4>
                          <p className="text-muted-foreground">
                            {selectedProduct?.description}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Price</h4>
                          <p className="text-2xl font-bold">
                            £{parseFloat(selectedProduct?.price || "0").toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Category</h4>
                          <p className="text-muted-foreground">
                            {selectedProduct?.category}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Vendor Details</h4>
                          <div className="space-y-2">
                            <p className="text-muted-foreground">
                              {selectedProduct?.vendor.name}
                            </p>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              <a
                                href={`mailto:${selectedProduct?.vendor.email}`}
                                className="text-primary hover:underline"
                              >
                                {selectedProduct?.vendor.email}
                              </a>
                            </div>
                            {selectedProduct?.vendor.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                <a
                                  href={`tel:${selectedProduct?.vendor.phone}`}
                                  className="text-primary hover:underline"
                                >
                                  {selectedProduct?.vendor.phone}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button className="w-full" variant="outline">
                            Contact Vendor
                          </Button>
                          <Button 
                            className="w-full"
                            onClick={() => {
                              cart.addItem({
                                id: selectedProduct!.id,
                                title: selectedProduct!.title,
                                price: Number(selectedProduct!.price),
                                imageUrl: selectedProduct!.imageUrl,
                                vendorId: selectedProduct!.vendor.id,
                                weight: selectedProduct!.weight,
                                dimensions: selectedProduct!.dimensions
                              });
                              toast({
                                title: "Added to Cart",
                                description: "Product has been added to your cart.",
                              });
                            }}
                          >
                            Add to Cart
                          </Button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  onClick={() => {
                    cart.addItem({
                      id: product.id,
                      title: product.title,
                      price: Number(product.price),
                      imageUrl: product.imageUrl,
                      vendorId: product.vendor.id,
                      weight: product.weight,
                      dimensions: product.dimensions
                    });
                    toast({
                      title: "Added to Cart",
                      description: "Product has been added to your cart.",
                    });
                  }}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}