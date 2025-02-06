import { useState, useRef } from 'react';
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";

interface ProductFormData {
  title: string;
  description: string;
  price: string;
  category: string;
  imageUrl?: string;
}

interface ProductFormProps {
  onSuccess?: () => void;
}

export function ProductForm({ onSuccess }: ProductFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const price = parseFloat(data.price);
      if (isNaN(price) || price <= 0) {
        throw new Error("Please enter a valid positive number for the price.");
      }

      const res = await apiRequest("POST", "/api/products", {
        ...data,
        price: price.toFixed(2), // Send price as dollars with 2 decimal places
      });

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Success", description: "Product created successfully" });
      form.reset();
      setPreviewUrl(undefined);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create product",
        variant: "destructive",
      });
    },
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

  return (
    <form onSubmit={form.handleSubmit((data) => createProductMutation.mutate(data))} className="space-y-6">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...form.register("title")} required />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...form.register("description")} required />
      </div>

      <div>
        <Label htmlFor="price">Price ($)</Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          {...form.register("price")}
          required
        />
      </div>

      <div>
        <Label htmlFor="category">Category</Label>
        <Input id="category" {...form.register("category")} required />
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
                <span className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</span>
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
        disabled={createProductMutation.isPending || uploading}
      >
        {createProductMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Product...
          </>
        ) : (
          'Create Product'
        )}
      </Button>
    </form>
  );
}