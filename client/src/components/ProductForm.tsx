import { useState, useRef } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";

const dimensionsSchema = z.object({
  length: z.string().regex(/^\d*\.?\d{0,2}$/, "Invalid length"),
  width: z.string().regex(/^\d*\.?\d{0,2}$/, "Invalid width"),
  height: z.string().regex(/^\d*\.?\d{0,2}$/, "Invalid height"),
  unit: z.enum(["cm", "in"]).default("cm"),
});

const variationSchema = z.object({
  sku: z.string().optional(),
  barcode: z.string().optional(),
  price: z.string().regex(/^\d*\.?\d{0,2}$/, "Invalid price"),
  compareAtPrice: z.string().regex(/^\d*\.?\d{0,2}$/, "Invalid compare at price").optional(),
  weight: z.string().regex(/^\d*\.?\d{0,2}$/, "Invalid weight").optional(),
  imageUrl: z.string().optional(),
  attributes: z.record(z.string()),
  quantity: z.string().regex(/^\d+$/, "Must be a whole number"),
});

const productFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  price: z.string().regex(/^\d*\.?\d{0,2}$/, "Invalid price format"),
  compareAtPrice: z.string().regex(/^\d*\.?\d{0,2}$/, "Invalid compare at price").optional(),
  category: z.string().min(1, "Category is required"),
  categoryId: z.number().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  weight: z.string().regex(/^\d*\.?\d{0,2}$/, "Invalid weight").optional(),
  dimensions: dimensionsSchema.optional(),
  shippingRequired: z.boolean().default(true),
  shippingWeight: z.string().regex(/^\d*\.?\d{0,2}$/, "Invalid shipping weight").optional(),
  tags: z.array(z.string()).default([]),
  status: z.enum(["draft", "active", "archived"]).default("draft"),
  hasVariants: z.boolean().default(false),
  variations: z.array(variationSchema).optional(),
  quantity: z.string().regex(/^\d+$/, "Must be a whole number").optional(),
  lowStockThreshold: z.string().regex(/^\d+$/, "Must be a whole number").optional(),
  imageUrl: z.string().optional(),
  galleryImages: z.array(z.string()).default([]),
});

type ProductFormData = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  onSuccess?: () => void;
  initialData?: ProductFormData;
}

export function ProductForm({ onSuccess, initialData }: ProductFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>(initialData?.galleryImages || []);
  const [variationDialogOpen, setVariationDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: initialData || {
      title: "",
      description: "",
      price: "",
      category: "",
      status: "draft",
      hasVariants: false,
      shippingRequired: true,
      tags: [],
      galleryImages: [],
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["/api/vendor/categories"],
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

          const newImages = [...selectedImages, data.url];
          setSelectedImages(newImages);
          form.setValue("galleryImages", newImages);

          if (!form.getValues("imageUrl")) {
            form.setValue("imageUrl", data.url);
          }

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
      const formattedData = {
        ...data,
        price: parseFloat(data.price),
        compareAtPrice: data.compareAtPrice ? parseFloat(data.compareAtPrice) : null,
        weight: data.weight ? parseFloat(data.weight) : null,
        shippingWeight: data.shippingWeight ? parseFloat(data.shippingWeight) : null,
        dimensions: data.dimensions ? {
          ...data.dimensions,
          length: parseFloat(data.dimensions.length),
          width: parseFloat(data.dimensions.width),
          height: parseFloat(data.dimensions.height),
        } : null,
        variations: data.variations?.map(v => ({
          ...v,
          price: parseFloat(v.price),
          compareAtPrice: v.compareAtPrice ? parseFloat(v.compareAtPrice) : null,
          weight: v.weight ? parseFloat(v.weight) : null,
          quantity: parseInt(v.quantity),
        })),
        quantity: data.quantity ? parseInt(data.quantity) : null,
        lowStockThreshold: data.lowStockThreshold ? parseInt(data.lowStockThreshold) : null,
      };

      const response = await apiRequest("POST", "/api/vendor/products", formattedData);
      if (!response.ok) {
        throw new Error("Failed to create product");
      }
      return response.json();
    },
    onSuccess: (newProduct) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/products"] });
      toast({ title: "Success", description: "Product created successfully" });
      form.reset();
      setSelectedImages([]);
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
          You need an active vendor subscription to create and manage products on Zecko.
        </p>
        <Button asChild variant="outline">
          <a href="/subscription">Upgrade to Vendor Plan</a>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit((data) => createProductMutation.mutate(data))} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" {...form.register("title")} required />
          {form.formState.errors.title && (
            <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="status">Status</Label>
          <Select
            value={form.watch("status")}
            onValueChange={(value) => form.setValue("status", value as "draft" | "active" | "archived")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...form.register("description")} required />
        {form.formState.errors.description && (
          <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="price">Price (£)</Label>
          <Input
            id="price"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            {...form.register("price")}
            required
          />
          {form.formState.errors.price && (
            <p className="text-sm text-red-500">{form.formState.errors.price.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="compareAtPrice">Compare at Price (Optional)</Label>
          <Input
            id="compareAtPrice"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            {...form.register("compareAtPrice")}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sku">SKU (Stock Keeping Unit)</Label>
          <Input id="sku" {...form.register("sku")} />
        </div>

        <div>
          <Label htmlFor="barcode">Barcode (ISBN, UPC, GTIN, etc.)</Label>
          <Input id="barcode" {...form.register("barcode")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">Category</Label>
          <Select
            value={form.watch("category")}
            onValueChange={(value) => {
              form.setValue("category", value);
              form.setValue("categoryId", parseInt(value));
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((category: any) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Tags</Label>
          <Input
            placeholder="Add tags separated by commas"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                const input = e.currentTarget;
                const value = input.value.trim();
                if (value) {
                  const currentTags = form.getValues("tags");
                  form.setValue("tags", [...currentTags, value]);
                  input.value = '';
                }
              }
            }}
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {form.watch("tags").map((tag, index) => (
              <div
                key={index}
                className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md flex items-center gap-2"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => {
                    const currentTags = form.getValues("tags");
                    form.setValue(
                      "tags",
                      currentTags.filter((_, i) => i !== index)
                    );
                  }}
                  className="text-secondary-foreground/50 hover:text-secondary-foreground"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Variants</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setVariationDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Variant
          </Button>
        </div>

        {/* Variations Dialog */}
        <Dialog open={variationDialogOpen} onOpenChange={setVariationDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Product Variant</DialogTitle>
            </DialogHeader>
            {/* Variation form fields go here */}
          </DialogContent>
        </Dialog>

        {/* Variation list */}
        <div className="space-y-2">
          {form.watch("variations")?.map((variation, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div>
                <p className="font-medium">{Object.values(variation.attributes).join(" / ")}</p>
                <p className="text-sm text-muted-foreground">
                  SKU: {variation.sku} | Stock: {variation.quantity}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const variations = form.getValues("variations") || [];
                  form.setValue(
                    "variations",
                    variations.filter((_, i) => i !== index)
                  );
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <Label>Product Images</Label>
        <div className="grid grid-cols-4 gap-4">
          {selectedImages.map((image, index) => (
            <div key={index} className="relative aspect-square">
              <img
                src={image}
                alt={`Product ${index + 1}`}
                className="absolute inset-0 w-full h-full object-cover rounded-lg"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => {
                  const newImages = [...selectedImages];
                  newImages.splice(index, 1);
                  setSelectedImages(newImages);
                  form.setValue("galleryImages", newImages);
                  if (form.getValues("imageUrl") === image) {
                    form.setValue("imageUrl", newImages[0] || "");
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <label className="relative aspect-square flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:bg-secondary/50">
            <Upload className="h-8 w-8 mb-2" />
            <span className="text-sm text-muted-foreground">Add Image</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      <div className="space-y-4">
        <Label>Shipping</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="weight">Weight (kg)</Label>
            <Input
              id="weight"
              type="text"
              inputMode="decimal"
              {...form.register("weight")}
            />
          </div>

          <div>
            <Label htmlFor="shippingWeight">Shipping Weight (kg)</Label>
            <Input
              id="shippingWeight"
              type="text"
              inputMode="decimal"
              {...form.register("shippingWeight")}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="dimensions.length">Length (cm)</Label>
            <Input
              id="dimensions.length"
              type="text"
              inputMode="decimal"
              {...form.register("dimensions.length")}
            />
          </div>
          <div>
            <Label htmlFor="dimensions.width">Width (cm)</Label>
            <Input
              id="dimensions.width"
              type="text"
              inputMode="decimal"
              {...form.register("dimensions.width")}
            />
          </div>
          <div>
            <Label htmlFor="dimensions.height">Height (cm)</Label>
            <Input
              id="dimensions.height"
              type="text"
              inputMode="decimal"
              {...form.register("dimensions.height")}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Label>Inventory</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              {...form.register("quantity")}
              min="0"
            />
          </div>

          <div>
            <Label htmlFor="lowStockThreshold">Low Stock Alert Threshold</Label>
            <Input
              id="lowStockThreshold"
              type="number"
              {...form.register("lowStockThreshold")}
              min="0"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <Button
          type="submit"
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
      </div>
    </form>
  );
}