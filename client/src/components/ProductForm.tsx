import { useState } from 'react';
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";

interface ProductFormData {
  title: string;
  description: string;
  price: string;
  category: string;
  imageUrl?: string;
}

export function ProductForm() {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>();

  const form = useForm<ProductFormData>({
    defaultValues: {
      title: "",
      description: "",
      price: "",
      category: "",
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const reader = new FileReader();

      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1]; // Remove data URL prefix

        try {
          const response = await apiRequest("POST", "/api/upload", {
            file: base64Data,
            fileName: file.name,
          });

          const data = await response.json();
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
      // Clean and validate price
      const cleanPrice = data.price
        .replace(/[^\d,.-]/g, '') // Remove any non-numeric characters except . , -
        .replace(',', '.') // Replace comma with dot
        .trim();

      const price = parseFloat(cleanPrice);

      if (isNaN(price)) {
        throw new Error("Invalid price format. Please enter a valid number.");
      }

      const res = await apiRequest("POST", "/api/products", {
        ...data,
        price: price.toFixed(2), // Ensure 2 decimal places
      });

      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Product created successfully",
      });
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
          type="text"
          inputMode="decimal"
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
            onClick={() => document.getElementById('file-upload')?.click()}
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
            id="file-upload"
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