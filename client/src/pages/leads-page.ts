import { z } from "zod";

export interface Message {
  id: number;
  lead_id: number;
  content: string;
  sender_id: number;
  receiver_id: number;
  read: boolean;
  created_at: string;
  sender?: {
    id: number;
    profile?: {
      name: string;
    };
  };
}

export interface SelectLead {
  id: number;
  user_id: number;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  budget: number;
  location: string;
  status: string;
  messages: Message[];
  responses?: Array<{
    id: number;
    proposal: string;
    status: string;
    business_id: number;
    business?: {
      profile?: {
        name: string;
      };
    };
  }>;
}

export interface SelectUser {
  id: number;
  email: string;
  profile?: any;
}

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
  ],
  "Cleaning & Maintenance": [
    "Residential Cleaning",
    "Commercial Cleaning",
    "Industrial Cleaning",
    "Specialized Cleaning",
    "Property Maintenance",
    "Waste Management"
  ]
} as const;

export function getUnreadCount(messages: Message[] | undefined, userId: number): number {
  if (!messages) return 0;
  return messages.filter(m => !m.read && m.sender_id !== userId).length;
}