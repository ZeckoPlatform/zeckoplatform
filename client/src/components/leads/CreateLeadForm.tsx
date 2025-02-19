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

export const PHONE_COUNTRY_CODES = {
  GB: {
    code: "44",
    format: "+44 XXXX XXXXXX",
    pattern: /^(\+?44|0)7\d{9}$/
  },
  US: {
    code: "1",
    format: "+1 (XXX) XXX-XXXX",
    pattern: /^(\+?1)?[2-9]\d{9}$/
  }
} as const;

// Types
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
      if (!val) return null;
      // Remove all non-digit characters except +
      const cleaned = val.replace(/[^\d+]/g, '');
      // If it starts with a 0, replace it with the country code
      if (cleaned.startsWith('0')) {
        const country = window.localStorage.getItem('userCountry') as CountryCode || 'GB';
        return `+${PHONE_COUNTRY_CODES[country].code}${cleaned.slice(1)}`;
      }
      // If it doesn't start with +, add it
      if (!cleaned.startsWith('+')) {
        const country = window.localStorage.getItem('userCountry') as CountryCode || 'GB';
        return `+${PHONE_COUNTRY_CODES[country].code}${cleaned}`;
      }
      return cleaned;
    })
    .refine((val) => {
      if (!val) return true; // Optional field
      const country = window.localStorage.getItem('userCountry') as CountryCode || 'GB';
      // Remove the + and country code for validation
      const numberWithoutCode = val.replace(new RegExp(`^\\+${PHONE_COUNTRY_CODES[country].code}`), '');
      return PHONE_COUNTRY_CODES[country].pattern.test(numberWithoutCode);
    }, {
      message: "Please enter a valid phone number"
    })
});

export type LeadFormData = z.infer<typeof createLeadSchema>;

interface CreateLeadFormProps {
  onSubmit: (data: LeadFormData) => void;
  isSubmitting: boolean;
}

export function CreateLeadForm({ onSubmit, isSubmitting }: CreateLeadFormProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const { user } = useAuth();
  const countryCode = (user?.countryCode || "GB") as CountryCode;

  const formatPhoneNumber = (value: string, country: CountryCode): string => {
    const digits = value.replace(/[^\d+]/g, "");
    if (digits.length <= 1) return digits;

    if (country === "US") {
      if (digits.startsWith('+1')) {
        const digitsOnly = digits.slice(2);
        if (digitsOnly.length <= 3) return `+1 (${digitsOnly}`;
        if (digitsOnly.length <= 6) return `+1 (${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3)}`;
        return `+1 (${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6, 10)}`;
      } else {
        const digitsOnly = digits;
        if (digitsOnly.length <= 3) return `+1 (${digitsOnly}`;
        if (digitsOnly.length <= 6) return `+1 (${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3)}`;
        return `+1 (${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6, 10)}`;
      }
    } else {
      if (digits.startsWith('+44')) {
        const digitsOnly = digits.slice(3);
        if (digitsOnly.length <= 4) return `+44 ${digitsOnly}`;
        return `+44 ${digitsOnly.slice(0, 4)} ${digitsOnly.slice(4, 10)}`;
      } else {
        const digitsOnly = digits;
        if (digitsOnly.length <= 4) return `+44 ${digitsOnly}`;
        return `+44 ${digitsOnly.slice(0, 4)} ${digitsOnly.slice(4, 10)}`;
      }
    }
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
    const formattedData = {
      ...data,
      budget: Number(data.budget),
      phoneNumber: data.phoneNumber || null
    };
    onSubmit(formattedData);
  });

  return (
    <div className="max-h-[60vh] overflow-y-auto px-4">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title field */}
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" {...form.register("title")} />
          {form.formState.errors.title && (
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
          {form.formState.errors.description && (
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
            {form.formState.errors.category && (
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
              {form.formState.errors.subcategory && (
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
          {form.formState.errors.budget && (
            <p className="text-sm text-destructive">{form.formState.errors.budget.message}</p>
          )}
        </div>

        {/* Location field */}
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" {...form.register("location")} />
          {form.formState.errors.location && (
            <p className="text-sm text-destructive">{form.formState.errors.location.message}</p>
          )}
        </div>

        {/* Phone Number field */}
        <div className="space-y-2">
          <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
          <Input
            id="phoneNumber"
            {...form.register("phoneNumber")}
            placeholder={PHONE_COUNTRY_CODES[countryCode].format}
            onChange={(e) => {
              const formatted = formatPhoneNumber(e.target.value, countryCode);
              form.setValue("phoneNumber", formatted, { shouldValidate: true });
            }}
          />
          {form.formState.errors.phoneNumber && (
            <p className="text-sm text-destructive">{form.formState.errors.phoneNumber.message}</p>
          )}
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