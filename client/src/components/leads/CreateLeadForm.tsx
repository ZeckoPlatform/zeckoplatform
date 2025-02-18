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

// Constants
export const PHONE_COUNTRY_CODES = {
  GB: {
    code: "44",
    format: "+44 XXXX XXXXXX",
    pattern: /^\+44\s\d{4}\s\d{6}$/
  },
  US: {
    code: "1",
    format: "+1 (XXX) XXX-XXXX",
    pattern: /^\+1\s\(\d{3}\)\s\d{3}-\d{4}$/
  }
} as const;

export const BUSINESS_CATEGORIES = {
  "IT & Software Development": [
    "Web Development",
    "Mobile App Development",
    "Cloud Services",
    "DevOps & Infrastructure",
    "Software Architecture",
    "Database Development",
    "Cybersecurity",
    "AI & Machine Learning"
  ],
  "Marketing & Advertising": [
    "Digital Marketing",
    "Content Marketing",
    "Social Media Marketing",
    "SEO & SEM",
    "Email Marketing",
    "Brand Strategy"
  ]
} as const;

// Types
type CountryCode = keyof typeof PHONE_COUNTRY_CODES;
type BusinessCategory = keyof typeof BUSINESS_CATEGORIES;

export const createLeadSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().min(1, "Subcategory is required"),
  budget: z.string().min(1, "Budget is required"),
  location: z.string().min(1, "Location is required"),
  phoneNumber: z.string()
    .optional()
    .refine((val) => {
      if (!val) return true; // Optional field
      const country = window.localStorage.getItem('userCountry') as CountryCode || 'GB';
      return PHONE_COUNTRY_CODES[country].pattern.test(val);
    }, "Invalid phone number format")
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
      const formatted = digits.startsWith('+1') ? digits : `+1${digits}`;
      const digitsOnly = formatted.slice(2);

      if (digitsOnly.length <= 3) {
        return `+1 (${digitsOnly}`;
      }
      if (digitsOnly.length <= 6) {
        return `+1 (${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3)}`;
      }
      if (digitsOnly.length > 6) {
        return `+1 (${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6, 10)}`;
      }
      return formatted;
    } else {
      const formatted = digits.startsWith('+44') ? digits : `+44${digits}`;
      const digitsOnly = formatted.slice(3);

      if (digitsOnly.length <= 4) {
        return `+44 ${digitsOnly}`;
      }
      if (digitsOnly.length > 4) {
        return `+44 ${digitsOnly.slice(0, 4)} ${digitsOnly.slice(4, 10)}`;
      }
      return formatted;
    }
  };

  const form = useForm<LeadFormData>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      subcategory: "",
      budget: "",
      location: "",
      phoneNumber: "",
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    console.log("Form data before submission:", data);
    onSubmit(data);
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...form.register("title")} />
        {form.formState.errors.title && (
          <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...form.register("description")}
        />
        {form.formState.errors.description && (
          <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
        )}
      </div>

      <div className="space-y-4">
        <div>
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
            <SelectContent>
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
          <div>
            <Label htmlFor="subcategory">Subcategory</Label>
            <Select
              onValueChange={(value) => form.setValue("subcategory", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a subcategory" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_CATEGORIES[selectedCategory as BusinessCategory].map((subcategory) => (
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

      <div>
        <Label htmlFor="budget">Budget (£)</Label>
        <Input
          id="budget"
          type="number"
          {...form.register("budget")}
        />
        {form.formState.errors.budget && (
          <p className="text-sm text-destructive">{form.formState.errors.budget.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="location">Location</Label>
        <Input id="location" {...form.register("location")} />
        {form.formState.errors.location && (
          <p className="text-sm text-destructive">{form.formState.errors.location.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
        <Input
          id="phoneNumber"
          {...form.register("phoneNumber")}
          placeholder={PHONE_COUNTRY_CODES[countryCode].format}
          onChange={(e) => {
            const formatted = formatPhoneNumber(e.target.value, countryCode);
            console.log("Formatted phone number:", formatted);
            form.setValue("phoneNumber", formatted, { shouldValidate: true });
          }}
        />
        {form.formState.errors.phoneNumber && (
          <p className="text-sm text-destructive">{form.formState.errors.phoneNumber.message}</p>
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
            Posting...
          </>
        ) : (
          'Post Lead'
        )}
      </Button>
    </form>
  );
}