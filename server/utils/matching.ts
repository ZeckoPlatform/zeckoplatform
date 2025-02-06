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
  totalScore: number;
  details: {
    categoryMatch: string[];
    locationMatch: boolean;
    budgetWithinRange: boolean;
    industryExperience: boolean;
  };
}

function calculateLocationScore(leadLocation: string | null, businessLocations: string[]): number {
  if (!leadLocation || !businessLocations?.length) return 0;
  return businessLocations.some(loc => 
    leadLocation.toLowerCase().includes(loc.toLowerCase()) || 
    loc.toLowerCase().includes(leadLocation.toLowerCase())
  ) ? 1 : 0;
}

function calculateBudgetScore(leadBudget: number | null, budgetRange: { min: number; max: number; } | undefined): number {
  if (!leadBudget || !budgetRange) return 0;
  return (leadBudget >= budgetRange.min && leadBudget <= budgetRange.max) ? 1 : 0;
}

function calculateIndustryScore(leadCategory: string, businessProfile: any): number {
  if (!businessProfile?.categories?.length) return 0;

  const businessCategories = Array.isArray(businessProfile.categories) 
    ? businessProfile.categories 
    : [];

  return businessCategories.some(cat => 
    leadCategory.toLowerCase().includes(cat.toLowerCase()) ||
    cat.toLowerCase().includes(leadCategory.toLowerCase())
  ) ? 1 : 0;
}

export function calculateMatchScore(lead: Lead, business: SelectUser): MatchScore {
  const businessPrefs = business.profile?.matchPreferences;
  const defaultScore = {
    categoryScore: 0,
    locationScore: 0,
    budgetScore: 0,
    industryScore: 0,
    totalScore: 0,
    details: {
      categoryMatch: [],
      locationMatch: false,
      budgetWithinRange: false,
      industryExperience: false,
    }
  };

  if (!businessPrefs || !business.profile) return defaultScore;

  // Category matching (30% weight)
  const categoryScore = businessPrefs.preferredCategories?.includes(lead.category) ? 1 : 0;

  // Location matching (25% weight)
  const locationScore = calculateLocationScore(
    lead.location, 
    businessPrefs.locationPreference || []
  );

  // Budget matching (25% weight)
  const budgetScore = calculateBudgetScore(
    lead.budget,
    businessPrefs.budgetRange
  );

  // Industry experience (20% weight)
  const industryScore = calculateIndustryScore(
    lead.category,
    business.profile
  );

  // Calculate weighted total score
  const totalScore = (
    (categoryScore * 0.30) +
    (locationScore * 0.25) +
    (budgetScore * 0.25) +
    (industryScore * 0.20)
  ) * 100;

  return {
    categoryScore,
    locationScore,
    budgetScore,
    industryScore,
    totalScore,
    details: {
      categoryMatch: businessPrefs.preferredCategories || [],
      locationMatch: locationScore > 0,
      budgetWithinRange: budgetScore > 0,
      industryExperience: industryScore > 0,
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