import { calculateMatchScore } from './matching';
import type { SelectUser } from '@db/schema';

describe('Enhanced Smart Match System', () => {
  const mockLead = {
    id: 1,
    user_id: 1,
    title: 'Test Lead',
    description: 'Test Description',
    category: 'web_development',
    subcategory: 'frontend',
    budget: 5000,
    location: 'London',
    phone_number: null,
    status: 'open',
    created_at: new Date(),
    expires_at: new Date(),
    region: 'GB',
    deleted_at: null,
  };

  const mockBusiness: SelectUser = {
    id: 1,
    email: 'test@business.com',
    password: 'hashed_password',
    userType: 'business',
    superAdmin: false,
    subscriptionActive: true,
    subscriptionTier: 'business',
    active: true,
    businessVerified: true,
    businessName: 'Test Business',
    countryCode: 'GB',
    profile: {
      categories: ['web_development'],
      matchPreferences: {
        preferredCategories: ['web_development'],
        locationPreference: ['London'],
        budgetRange: {
          min: 1000,
          max: 10000,
        },
        radius: 50,
        availability: {
          days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          hours: {
            start: '09:00',
            end: '17:00',
          }
        },
        serviceCategories: ['web_development', 'frontend'],
        industryExperience: ['technology']
      }
    }
  };

  test('calculates match score with all preferences matching', () => {
    const score = calculateMatchScore(mockLead, mockBusiness);
    expect(score.totalScore).toBeGreaterThan(90);
    expect(score.details.categoryMatch).toContain('web_development');
    expect(score.details.locationMatch).toBe(true);
    expect(score.details.budgetWithinRange).toBe(true);
    expect(score.details.industryExperience).toBe(true);
    expect(score.details.availabilityMatch).toBe(true);
  });

  test('calculates lower score with mismatched budget', () => {
    const lowBudgetLead = { ...mockLead, budget: 500 };
    const score = calculateMatchScore(lowBudgetLead, mockBusiness);
    expect(score.totalScore).toBeLessThan(90);
    expect(score.budgetScore).toBe(0);
  });

  test('calculates lower score with mismatched location', () => {
    const differentLocationLead = { ...mockLead, location: 'Manchester' };
    const score = calculateMatchScore(differentLocationLead, mockBusiness);
    expect(score.totalScore).toBeLessThan(90);
    expect(score.locationScore).toBe(0);
  });

  test('calculates lower score with mismatched category', () => {
    const differentCategoryLead = { ...mockLead, category: 'marketing' };
    const score = calculateMatchScore(differentCategoryLead, mockBusiness);
    expect(score.totalScore).toBeLessThan(70);
    expect(score.categoryScore).toBe(0);
  });
});
