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

type BusinessCategories = {
  [key: string]: string[];
};

export const BUSINESS_CATEGORIES: BusinessCategories = {
  "IT & Software Development": [
    "Web Development",
    "Mobile App Development",
    "Cloud Services",
    "DevOps & Infrastructure",
    "Software Architecture",
    "Database Development",
    "Cybersecurity",
    "AI & Machine Learning",
    "Enterprise Software",
    "API Development",
    "Quality Assurance",
    "Blockchain Development",
    "IoT Solutions",
    "Game Development",
    "UI/UX Design",
    "Technical Support"
  ],
  "Marketing & Advertising": [
    "Digital Marketing",
    "Content Marketing",
    "Social Media Marketing",
    "SEO & SEM",
    "Email Marketing",
    "Brand Strategy",
    "Market Research",
    "Video Marketing",
    "Influencer Marketing",
    "PPC Advertising",
    "Marketing Analytics",
    "Affiliate Marketing",
    "Public Relations",
    "Event Marketing",
    "Marketing Automation",
    "Outdoor Advertising"
  ],
  "Business Services": [
    "Business Consulting",
    "Financial Services",
    "Legal Services",
    "Accounting & Bookkeeping",
    "Human Resources",
    "Project Management",
    "Business Planning",
    "Market Analysis",
    "Risk Management",
    "Supply Chain Management",
    "Strategic Planning",
    "Operations Management",
    "Business Process Optimization",
    "Change Management",
    "Mergers & Acquisitions",
    "Corporate Training"
  ],
  "Professional Services": [
    "Management Consulting",
    "Training & Development",
    "Research Services",
    "Technical Writing",
    "Translation Services",
    "Data Analysis",
    "Business Process Outsourcing",
    "Quality Management",
    "Compliance Services",
    "Patent Services",
    "Tax Consulting",
    "Business Valuation",
    "Recruitment Services",
    "Virtual Assistant Services",
    "Office Administration"
  ],
  "Cleaning & Maintenance": [
    "Residential Cleaning",
    "Commercial Cleaning",
    "Industrial Cleaning",
    "Specialized Cleaning",
    "Property Maintenance",
    "Waste Management",
    "Janitorial Services",
    "Window Cleaning",
    "Carpet Cleaning",
    "Facility Management",
    "Pool Maintenance",
    "Garden Maintenance",
    "Pest Control",
    "Air Duct Cleaning",
    "Disaster Recovery Cleaning"
  ],
  "Construction & Trades": [
    "General Contracting",
    "Electrical Services",
    "Plumbing Services",
    "HVAC Services",
    "Carpentry",
    "Masonry",
    "Painting",
    "Roofing",
    "Landscaping",
    "Interior Design",
    "Architecture Services",
    "Renovation Services",
    "Building Inspection",
    "Flooring Installation",
    "Solar Installation",
    "Home Automation"
  ],
  "Healthcare & Medical": [
    "Medical Services",
    "Healthcare Consulting",
    "Mental Health Services",
    "Physical Therapy",
    "Medical Equipment",
    "Healthcare Technology",
    "Pharmaceutical Services",
    "Wellness Programs",
    "Telemedicine",
    "Dental Services",
    "Alternative Medicine",
    "Nutrition Services",
    "Medical Research",
    "Elder Care Services",
    "Medical Training"
  ],
  "Education & Training": [
    "Professional Training",
    "Corporate Training",
    "E-Learning Development",
    "Educational Consulting",
    "Language Training",
    "Skills Development",
    "Curriculum Development",
    "Educational Technology",
    "Vocational Training",
    "Test Preparation",
    "Music Education",
    "Art Education",
    "Special Education",
    "Adult Education",
    "Early Childhood Education"
  ],
  "Retail & E-commerce": [
    "Online Retail",
    "Brick and Mortar Retail",
    "Dropshipping",
    "Inventory Management",
    "E-commerce Platform Development",
    "Retail Analytics",
    "Customer Service",
    "Supply Chain Solutions",
    "Payment Processing",
    "Marketplace Management",
    "Product Photography",
    "Retail Consulting"
  ],
  "Transportation & Logistics": [
    "Freight Services",
    "Courier Services",
    "Warehousing",
    "Fleet Management",
    "Last-Mile Delivery",
    "Logistics Consulting",
    "Supply Chain Optimization",
    "International Shipping",
    "Cold Chain Logistics",
    "Transportation Technology"
  ]
};

export function getUnreadCount(messages: Message[] | undefined, userId: number): number {
  if (!messages) return 0;
  return messages.filter(m => !m.read && m.sender_id !== userId).length;
}