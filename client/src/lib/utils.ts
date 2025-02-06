import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// UK postcode regex pattern
const UK_POSTCODE_PATTERN = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;

export function isValidUKPostcode(postcode: string): boolean {
  return UK_POSTCODE_PATTERN.test(postcode.trim());
}

// Format postcode to standard format (e.g., "SW1A 1AA")
export function formatUKPostcode(postcode: string): string {
  const cleaned = postcode.trim().toUpperCase();
  if (!isValidUKPostcode(cleaned)) return cleaned;

  const length = cleaned.replace(/\s/g, '').length;
  const index = length - 3;
  return cleaned.replace(/\s/g, '').slice(0, index) + ' ' + cleaned.replace(/\s/g, '').slice(index);
}