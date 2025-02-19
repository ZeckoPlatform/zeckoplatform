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
  countryCode?: 'GB' | 'US';
  profile: {
    name?: string;
    bio?: string;
    phoneNumber?: string;
    company?: string;
    jobTitle?: string;
    website?: string;
    address?: string;
  };
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
    "Technical Support",
    "System Administration",
    "Network Security",
    "Data Science",
    "VR/AR Development"
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
    "Outdoor Advertising",
    "Guerrilla Marketing",
    "Trade Show Marketing",
    "Direct Mail Marketing",
    "Marketing Strategy"
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
    "Corporate Training",
    "Business Intelligence",
    "Quality Management",
    "Crisis Management",
    "International Business"
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
    "Office Administration",
    "Document Management",
    "Legal Consulting",
    "Financial Advisory",
    "Risk Assessment",
    "Business Development"
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
    "Disaster Recovery Cleaning",
    "Sanitization Services",
    "Green Cleaning",
    "Equipment Maintenance",
    "Floor Care",
    "Pressure Washing"
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
    "Home Automation",
    "Concrete Work",
    "Demolition Services",
    "Fencing",
    "Custom Cabinetry"
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
    "Medical Training",
    "Home Healthcare",
    "Occupational Therapy",
    "Speech Therapy",
    "Diagnostic Services",
    "Medical Transportation"
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
    "Early Childhood Education",
    "STEM Education",
    "Distance Learning",
    "Career Counseling",
    "Educational Assessment",
    "Teacher Training"
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
    "Retail Consulting",
    "Visual Merchandising",
    "Point of Sale Systems",
    "Retail Security",
    "Store Design",
    "Retail Marketing",
    "Fulfillment Services",
    "Category Management",
    "Retail Training"
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
    "Transportation Technology",
    "Customs Brokerage",
    "Cross-Border Logistics",
    "Inventory Management",
    "Route Optimization",
    "Packaging Solutions",
    "Asset Tracking",
    "Reverse Logistics",
    "Freight Forwarding",
    "Transportation Safety",
    "Logistics Training"
  ],
  "Creative & Design": [
    "Graphic Design",
    "Web Design",
    "Brand Identity Design",
    "Packaging Design",
    "Motion Graphics",
    "3D Modeling",
    "Animation",
    "Illustration",
    "Print Design",
    "Product Design",
    "UX/UI Design",
    "Art Direction",
    "Visual Effects",
    "Logo Design",
    "Interior Design",
    "Fashion Design",
    "Industrial Design",
    "Exhibition Design",
    "Environmental Design",
    "Design Consulting"
  ],
  "Personal Services": [
    "Dog Walking",
    "Pet Sitting",
    "Personal Training",
    "Life Coaching",
    "Personal Shopping",
    "Personal Chef",
    "Home Organization",
    "Event Planning",
    "Wedding Planning",
    "Meditation & Mindfulness",
    "Personal Styling",
    "Beauty Services",
    "Massage Therapy",
    "Tutoring",
    "Career Coaching",
    "Dating Coaching",
    "Fitness Training",
    "Nutrition Coaching",
    "Child Care",
    "Senior Care"
  ],
  "Pet Services": [
    "Dog Walking",
    "Pet Grooming",
    "Pet Training",
    "Pet Boarding",
    "Pet Daycare",
    "Veterinary Services",
    "Pet Photography",
    "Mobile Pet Services",
    "Pet Therapy",
    "Pet Transportation",
    "Aquarium Maintenance",
    "Horse Training",
    "Pet Sitting",
    "Pet Food Delivery",
    "Pet Waste Removal"
  ],
  "Home Services": [
    "House Cleaning",
    "Gardening",
    "Lawn Care",
    "Pool Maintenance",
    "Home Security",
    "Smart Home Installation",
    "Furniture Assembly",
    "Moving Services",
    "Storage Solutions",
    "Home Staging",
    "Interior Decorating",
    "Window Treatment",
    "Appliance Repair",
    "Pest Control",
    "Gutter Cleaning"
  ],
  "Automotive Services": [
    "Car Repair",
    "Car Detailing",
    "Mobile Mechanic",
    "Tire Services",
    "Paint & Body Work",
    "Car Wash",
    "Vehicle Inspection",
    "Auto Glass Repair",
    "Car Audio Installation",
    "Electric Vehicle Service",
    "Fleet Maintenance",
    "Motorcycle Repair",
    "Roadside Assistance",
    "Vehicle Wrapping",
    "Automotive Locksmith"
  ],
  "Food & Beverage": [
    "Catering",
    "Personal Chef",
    "Meal Prep Services",
    "Food Delivery",
    "Restaurant Consulting",
    "Bartending Services",
    "Food Photography",
    "Food Truck Services",
    "Wine Consulting",
    "Cooking Classes",
    "Specialty Baking",
    "Coffee Roasting",
    "Craft Brewing",
    "Food Safety Consulting",
    "Menu Development"
  ]
};

export function getUnreadCount(messages: Message[] | undefined, userId: number): number {
  if (!messages) return 0;
  return messages.filter(m => !m.read && m.sender_id !== userId).length;
}