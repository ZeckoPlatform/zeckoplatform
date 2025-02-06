import { useState, useRef } from 'react';
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface ProductFormData {
  title: string;
  description: string;
  price: string;
  category: string;
  imageUrl?: string;
}

export function ProductForm() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: subscription } = useQuery({
    queryKey: ["/api/subscriptions/current"],
    enabled: !!user && user.userType === "vendor",
  });

  const canCreateProducts = user?.userType === "vendor" && user?.subscriptionActive;

  if (!canCreateProducts) {
    return (
      <div className="text-center p-6 bg-muted rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Subscription Required</h3>
        <p className="text-sm text-muted-foreground mb-4">
          You need an active vendor subscription to create and manage products.
        </p>
        <Button asChild variant="outline">
          <a href="/subscription">Upgrade to Vendor Plan</a>
        </Button>
      </div>
    );
  }

  const form = useForm<ProductFormData>({
    defaultValues: {
      title: "",
      description: "",
      price: "",
      category: "",
      imageUrl: "",
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
          console.log("Upload Response:", data);

          if (!data.url) {
            throw new Error("Image upload failed");
          }

          form.setValue("imageUrl", data.url);
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
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
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
      toast({ title: "Success", description: "Product created successfully" });
      form.reset();
      setPreviewUrl(undefined);
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
    <form onSubmit={form.handleSubmit((data) => createProductMutation.mutate(data))} className="space-y-6">
      <Label htmlFor="title">Title</Label>
      <Input id="title" {...form.register("title")} required />

      <Label htmlFor="description">Description</Label>
      <Textarea id="description" {...form.register("description")} required />

      <Label htmlFor="price">Price ($)</Label>
      <Input id="price" type="number" step="0.01" min="0" {...form.register("price")} required />

      <Label htmlFor="category">Category</Label>
      <Input id="category" {...form.register("category")} required />

      <Label>Product Image</Label>
      <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
        {uploading ? <Loader2 className="animate-spin" /> : <Upload />} Upload Image
      </Button>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
      {previewUrl && <img src={previewUrl} alt="Product preview" className="w-full h-48 object-contain" />}

      <Button type="submit" disabled={createProductMutation.isPending || uploading}>
        {createProductMutation.isPending ? <Loader2 className="animate-spin" /> : "Create Product"}
      </Button>
    </form>
  );
}