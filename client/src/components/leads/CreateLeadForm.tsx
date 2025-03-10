import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { BUSINESS_CATEGORIES } from "@/types/leads";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const createLeadSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  budget: z.string()
    .min(1, "Budget is required")
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
      "Budget must be a valid positive number"
    ),
  location: z.string().min(1, "Location is required"),
  phone_number: z.string().optional().nullable()
});

export type LeadFormData = z.infer<typeof createLeadSchema>;

interface CreateLeadFormProps {
  onSubmit: (data: LeadFormData) => void;
  isSubmitting: boolean;
  defaultValues?: LeadFormData;
}

function CreateLeadFormInner({ onSubmit, isSubmitting, defaultValues }: CreateLeadFormProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(defaultValues?.category || "");

  const form = useForm<LeadFormData>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: defaultValues || {
      title: "",
      description: "",
      category: "",
      subcategory: "",
      budget: "",
      location: "",
      phone_number: ""
    },
  });

  const handleSubmit = (data: LeadFormData) => {
    console.log('Form submission data:', data);
    onSubmit(data);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pb-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...form.register("title")} />
        {form.formState.errors.title?.message && (
          <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...form.register("description")}
          className="min-h-[100px]"
        />
        {form.formState.errors.description?.message && (
          <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            onValueChange={(value) => {
              setSelectedCategory(value);
              form.setValue("category", value);
              form.setValue("subcategory", "");
            }}
            defaultValue={defaultValues?.category}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(BUSINESS_CATEGORIES).map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.category?.message && (
            <p className="text-sm text-destructive">{form.formState.errors.category.message}</p>
          )}
        </div>

        {selectedCategory && (
          <div className="space-y-2">
            <Label htmlFor="subcategory">Subcategory</Label>
            <Select
              onValueChange={(value) => form.setValue("subcategory", value)}
              defaultValue={defaultValues?.subcategory}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a subcategory" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_CATEGORIES[selectedCategory as keyof typeof BUSINESS_CATEGORIES]?.map((subcategory) => (
                  <SelectItem key={subcategory} value={subcategory}>
                    {subcategory}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.subcategory?.message && (
              <p className="text-sm text-destructive">{form.formState.errors.subcategory.message}</p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="budget">Budget (£)</Label>
        <Input
          id="budget"
          type="number"
          min="0"
          step="0.01"
          {...form.register("budget")}
        />
        {form.formState.errors.budget?.message && (
          <p className="text-sm text-destructive">{form.formState.errors.budget.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input id="location" {...form.register("location")} />
        {form.formState.errors.location?.message && (
          <p className="text-sm text-destructive">{form.formState.errors.location.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone_number">Phone Number (Optional)</Label>
        <Input
          id="phone_number"
          type="tel"
          {...form.register("phone_number")}
          placeholder="Enter phone number (optional)"
        />
        {form.formState.errors.phone_number?.message && (
          <p className="text-sm text-destructive">{form.formState.errors.phone_number.message}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Lead...
          </>
        ) : (
          'Create Lead'
        )}
      </Button>
    </form>
  );
}

export function CreateLeadForm(props: CreateLeadFormProps) {
  return (
    <ErrorBoundary>
      <CreateLeadFormInner {...props} />
    </ErrorBoundary>
  );
}