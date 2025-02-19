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
import { useAuth } from "@/hooks/use-auth";
import { BUSINESS_CATEGORIES } from "@/types/leads";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const PHONE_COUNTRY_CODES = {
  GB: {
    code: "44",
    format: "+44 XXXX XXXXXX",
    example: "+44 7911 123456",
    pattern: /^\+44\s\d{4}\s\d{6}$/
  },
  US: {
    code: "1",
    format: "+1 (XXX) XXX-XXXX",
    example: "+1 (555) 123-4567",
    pattern: /^\+1\s\(\d{3}\)\s\d{3}-\d{4}$/
  }
} as const;

type CountryCode = keyof typeof PHONE_COUNTRY_CODES;

export const createLeadSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().min(1, "Subcategory is required"),
  budget: z.number().min(0, "Budget must be a positive number"),
  location: z.string().min(1, "Location is required"),
  phoneNumber: z.string()
    .optional()
    .nullable()
    .transform(val => {
      console.log('Phone transform - input value:', val);
      if (!val || val.trim() === '') return null;
      return val;
    })
    .refine((val) => {
      if (!val) return true; // Allow empty values
      console.log('Phone validation - testing pattern for:', val);
      // Test against exact patterns
      const gbMatch = PHONE_COUNTRY_CODES.GB.pattern.test(val);
      const usMatch = PHONE_COUNTRY_CODES.US.pattern.test(val);
      console.log('Phone validation - GB match:', gbMatch, 'US match:', usMatch);
      return gbMatch || usMatch;
    }, {
      message: "Please enter a valid phone number in the exact format shown (including spaces and symbols)"
    })
});

export type LeadFormData = z.infer<typeof createLeadSchema>;

interface CreateLeadFormProps {
  onSubmit: (data: LeadFormData) => void;
  isSubmitting: boolean;
}

function CreateLeadFormInner({ onSubmit, isSubmitting }: CreateLeadFormProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const { user } = useAuth();
  const countryCode = (user?.countryCode || "GB") as CountryCode;

  const formatPhoneNumber = (value: string, country: CountryCode) => {
    // Remove all non-digit characters except +
    const cleaned = value.replace(/[^\d+]/g, '');

    if (cleaned === '') return '';

    // For US numbers
    if (country === 'US') {
      if (!cleaned.startsWith('+1')) {
        const digits = cleaned.replace(/\D/g, '');
        if (digits.length === 0) return '';
        if (digits.length <= 3) return `+1 (${digits}`;
        if (digits.length <= 6) return `+1 (${digits.slice(0,3)}) ${digits.slice(3)}`;
        return `+1 (${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6,10)}`;
      }
      const digits = cleaned.slice(2);
      if (digits.length === 0) return '+1 ';
      if (digits.length <= 3) return `+1 (${digits}`;
      if (digits.length <= 6) return `+1 (${digits.slice(0,3)}) ${digits.slice(3)}`;
      return `+1 (${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6,10)}`;
    }

    // For UK numbers
    if (!cleaned.startsWith('+44')) {
      const digits = cleaned.replace(/\D/g, '');
      if (digits.length === 0) return '';
      if (digits.length <= 4) return `+44 ${digits}`;
      return `+44 ${digits.slice(0,4)} ${digits.slice(4,10)}`;
    }
    const digits = cleaned.slice(3);
    if (digits.length === 0) return '+44 ';
    if (digits.length <= 4) return `+44 ${digits}`;
    return `+44 ${digits.slice(0,4)} ${digits.slice(4,10)}`;
  };

  const form = useForm<LeadFormData>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      subcategory: "",
      budget: 0,
      location: "",
      phoneNumber: "",
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    console.log('Form submission - phone number:', data.phoneNumber);
    onSubmit({
      ...data,
      budget: Number(data.budget),
      phoneNumber: data.phoneNumber || null
    });
  });

  return (
    <div className="max-h-[60vh] overflow-y-auto px-4">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title field */}
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" {...form.register("title")} />
          {form.formState.errors.title?.message && (
            <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
          )}
        </div>

        {/* Description field */}
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

        {/* Category fields */}
        <div className="grid gap-6">
          <div className="space-y-2">
            <Label htmlFor="category">Main Category</Label>
            <Select
              onValueChange={(value) => {
                setSelectedCategory(value);
                form.setValue("category", value);
                form.setValue("subcategory", "");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a main category" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
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
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a subcategory" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  {BUSINESS_CATEGORIES[selectedCategory]?.map((subcategory) => (
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

        {/* Budget field */}
        <div className="space-y-2">
          <Label htmlFor="budget">Budget (£)</Label>
          <Input
            id="budget"
            type="number"
            min="0"
            step="1"
            {...form.register("budget", { valueAsNumber: true })}
          />
          {form.formState.errors.budget?.message && (
            <p className="text-sm text-destructive">{form.formState.errors.budget.message}</p>
          )}
        </div>

        {/* Location field */}
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" {...form.register("location")} />
          {form.formState.errors.location?.message && (
            <p className="text-sm text-destructive">{form.formState.errors.location.message}</p>
          )}
        </div>

        {/* Phone Number field */}
        <div className="space-y-2">
          <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
          <Input
            id="phoneNumber"
            {...form.register("phoneNumber")}
            placeholder={PHONE_COUNTRY_CODES[countryCode].example}
            onChange={(e) => {
              const formatted = formatPhoneNumber(e.target.value, countryCode);
              console.log('Phone formatting - input:', e.target.value, 'formatted:', formatted);
              e.target.value = formatted;
              form.setValue("phoneNumber", formatted, { shouldValidate: true });
            }}
          />
          {form.formState.errors.phoneNumber?.message && (
            <p className="text-sm text-destructive">{form.formState.errors.phoneNumber.message}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Format: {PHONE_COUNTRY_CODES[countryCode].format}
          </p>
        </div>

        {/* Submit button */}
        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Posting...
            </>
          ) : (
            'Post Lead'
          )}
        </Button>
      </form>
    </div>
  );
}

export function CreateLeadForm(props: CreateLeadFormProps) {
  return (
    <ErrorBoundary>
      <CreateLeadFormInner {...props} />
    </ErrorBoundary>
  );
}