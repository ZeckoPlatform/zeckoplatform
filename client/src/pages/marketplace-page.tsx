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
import { Search } from "lucide-react";

export default function MarketplacePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const form = useForm({
    defaultValues: {
      title: "",
      description: "",
      price: "",
      category: "",
      imageUrl: "",
    },
  });

  const { data: products } = useQuery<any[]>({
    queryKey: ["/api/products"],
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/products", {
        ...data,
        price: parseFloat(data.price),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Product Created",
        description: "Your product has been listed successfully.",
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
                  <DialogContent aria-describedby="dialog-description">
                    <DialogHeader>
                      <DialogTitle>Add New Product</DialogTitle>
                      <DialogDescription id="dialog-description">
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
                      <Button type="submit" className="w-full">
                        List Product
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
              <CardFooter>
                <Button className="w-full" variant="secondary">
                  View Details
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}