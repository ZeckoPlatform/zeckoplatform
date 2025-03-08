import { type SelectUser } from "@db/schema";
import type { z } from "zod";
import { type InferSelectModel } from "drizzle-orm";
import { leads } from "@db/schema";

type Lead = InferSelectModel<typeof leads>;

interface MatchScore {
  categoryScore: number;
  locationScore: number;
  budgetScore: number;
  industryScore: number;
  availabilityScore: number;
  totalScore: number;
  details: {
    categoryMatch: string[];
    locationMatch: boolean;
    budgetWithinRange: boolean;
    industryExperience: boolean;
    availabilityMatch: boolean;
    withinRadius: boolean;
  };
}

function calculateLocationScore(leadLocation: string | null, businessProfile: any): number {
  if (!leadLocation || !businessProfile?.matchPreferences?.locationPreference?.length) return 0;

  const locationPreference = businessProfile.matchPreferences.locationPreference;
  const radius = businessProfile.matchPreferences.radius || 50; // Default 50 miles/km

  // Check if location is within preferred locations
  const locationMatch = locationPreference.some(loc => 
    leadLocation.toLowerCase().includes(loc.toLowerCase()) || 
    loc.toLowerCase().includes(leadLocation.toLowerCase())
  );

  // TODO: Implement actual distance calculation based on coordinates
  // For now, we'll use simple string matching but include radius awareness
  return locationMatch ? 1 : 0;
}

function calculateBudgetScore(leadBudget: number | null, businessProfile: any): number {
  const budgetRange = businessProfile?.matchPreferences?.budgetRange;
  if (!leadBudget || !budgetRange) return 0;
  return (leadBudget >= budgetRange.min && leadBudget <= budgetRange.max) ? 1 : 0;
}

function calculateIndustryScore(leadCategory: string, businessProfile: any): number {
  const preferredCategories = businessProfile?.matchPreferences?.serviceCategories || 
                            businessProfile?.categories || [];

  if (!preferredCategories.length) return 0;

  return preferredCategories.some(cat => 
    leadCategory.toLowerCase().includes(cat.toLowerCase()) ||
    cat.toLowerCase().includes(leadCategory.toLowerCase())
  ) ? 1 : 0;
}

function calculateAvailabilityScore(lead: Lead, businessProfile: any): number {
  const availability = businessProfile?.matchPreferences?.availability;
  if (!availability) return 1; // If no preferences set, consider available

  // TODO: Implement actual time-based matching
  // For now, we'll assume availability matches if the days overlap
  const today = new Date().toLocaleLowerCase().split(',')[0];
  return availability.days.includes(today) ? 1 : 0;
}

export function calculateMatchScore(lead: Lead, business: SelectUser): MatchScore {
  const businessProfile = business.profile;
  const defaultScore = {
    categoryScore: 0,
    locationScore: 0,
    budgetScore: 0,
    industryScore: 0,
    availabilityScore: 0,
    totalScore: 0,
    details: {
      categoryMatch: [],
      locationMatch: false,
      budgetWithinRange: false,
      industryExperience: false,
      availabilityMatch: false,
      withinRadius: false
    }
  };

  if (!businessProfile) return defaultScore;

  // Category matching (25% weight)
  const categoryScore = businessProfile.matchPreferences?.preferredCategories?.includes(lead.category) ? 1 : 0;

  // Location matching (20% weight)
  const locationScore = calculateLocationScore(lead.location, businessProfile);

  // Budget matching (20% weight)
  const budgetScore = calculateBudgetScore(lead.budget, businessProfile);

  // Industry experience (20% weight)
  const industryScore = calculateIndustryScore(lead.category, businessProfile);

  // Availability matching (15% weight)
  const availabilityScore = calculateAvailabilityScore(lead, businessProfile);

  // Calculate weighted total score
  const totalScore = (
    (categoryScore * 0.25) +
    (locationScore * 0.20) +
    (budgetScore * 0.20) +
    (industryScore * 0.20) +
    (availabilityScore * 0.15)
  ) * 100;

  return {
    categoryScore,
    locationScore,
    budgetScore,
    industryScore,
    availabilityScore,
    totalScore,
    details: {
      categoryMatch: businessProfile.matchPreferences?.preferredCategories || [],
      locationMatch: locationScore > 0,
      budgetWithinRange: budgetScore > 0,
      industryExperience: industryScore > 0,
      availabilityMatch: availabilityScore > 0,
      withinRadius: locationScore > 0
    }
  };
}

export function sortBusinessesByMatch(lead: Lead, businesses: SelectUser[]): SelectUser[] {
  return businesses
    .map(business => ({
      business,
      score: calculateMatchScore(lead, business),
    }))
    .sort((a, b) => b.score.totalScore - a.score.totalScore)
    .map(item => item.business);
}