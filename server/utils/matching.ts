import { type SelectUser } from "@db/schema";
import type { z } from "zod";
import { type InferSelectModel } from "drizzle-orm";
import { leads } from "@db/schema";

type Lead = InferSelectModel<typeof leads>;

interface MatchScore {
  categoryScore: number;
  locationScore: number;
  budgetScore: number;
  totalScore: number;
}

export function calculateMatchScore(lead: Lead, business: SelectUser): MatchScore {
  const scores = {
    categoryScore: 0,
    locationScore: 0,
    budgetScore: 0,
    totalScore: 0,
  };

  const businessPrefs = business.profile?.matchPreferences;
  if (!businessPrefs) return scores;

  // Category matching (40% weight)
  if (businessPrefs.preferredCategories?.includes(lead.category)) {
    scores.categoryScore = 1;
  }

  // Location matching (30% weight)
  if (lead.location && businessPrefs.locationPreference?.includes(lead.location)) {
    scores.locationScore = 1;
  }

  // Budget matching (30% weight)
  if (lead.budget && businessPrefs.budgetRange) {
    if (
      lead.budget >= businessPrefs.budgetRange.min &&
      lead.budget <= businessPrefs.budgetRange.max
    ) {
      scores.budgetScore = 1;
    }
  }

  // Calculate weighted total score
  scores.totalScore =
    scores.categoryScore * 0.4 +
    scores.locationScore * 0.3 +
    scores.budgetScore * 0.3;

  return scores;
}

export function sortBusinessesByMatch(lead: Lead, businesses: SelectUser[]): SelectUser[] {
  return businesses
    .map(business => ({
      business,
      score: calculateMatchScore(lead, business).totalScore,
    }))
    .sort((a, b) => b.score - a.score)
    .map(item => item.business);
}