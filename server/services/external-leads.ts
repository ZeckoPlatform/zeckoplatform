import axios from 'axios';
import { db } from "@db";
import { leads } from "@db/schema";
import { getCountryFromLocation } from '../utils/location';
import { z } from "zod";

// Enhanced validation schema for external leads
const externalLeadSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().optional(),
  budget: z.number().optional(),
  location: z.string().optional(),
});

// Common lead sources
export const PRESET_SOURCES = {
  RSS: [
    {
      name: "UK Business Forums",
      url: "https://www.ukbusinessforums.co.uk/forums/-/index.rss",
      type: "rss" as const,
    },
    {
      name: "US Small Business Administration",
      url: "https://www.sba.gov/rss",
      type: "rss" as const,
    }
  ],
  API: [
    {
      name: "UK Government Contracts",
      url: "https://www.contractsfinder.service.gov.uk/Published/Notices/",
      type: "api" as const,
      requiresKey: true,
    },
    {
      name: "US Federal Business Opportunities",
      url: "https://sam.gov/api/prod/opportunities/v2/search",
      type: "api" as const,
      requiresKey: true,
    }
  ]
};

export async function importLeadsFromRSS(url: string, userId: number) {
  try {
    const response = await axios.get(url);
    const parser = new (require('rss-parser'))();
    const feed = await parser.parseString(response.data);

    const importedLeads = await Promise.all(feed.items.map(async (item: any) => {
      // Extract and normalize data
      const lead = {
        title: item.title,
        description: item.contentSnippet || item.content,
        category: extractCategory(item.categories?.[0] || item.content),
        location: item.location || extractLocation(item.content),
        budget: extractBudget(item.content),
      };

      // Validate lead data
      const validatedLead = externalLeadSchema.parse(lead);
      return validatedLead;
    }));

    return await saveLeads(importedLeads.filter(lead => lead), userId);
  } catch (error) {
    console.error('Failed to import leads from RSS:', error);
    throw new Error('Failed to import leads from RSS feed');
  }
}

export async function importLeadsFromAPI(apiUrl: string, apiKey: string | undefined, userId: number) {
  try {
    const response = await axios.get(apiUrl, {
      headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : undefined
    });

    const importedLeads = await Promise.all(response.data.map(async (item: any) => {
      // Extract and normalize data
      const lead = {
        title: item.title || item.name,
        description: item.description || item.details,
        category: item.category || extractCategory(item.description),
        location: item.location || extractLocation(item.description),
        budget: typeof item.budget === 'number' ? item.budget : extractBudget(item.description),
      };

      // Validate lead data
      const validatedLead = externalLeadSchema.parse(lead);
      return validatedLead;
    }));

    return await saveLeads(importedLeads.filter(lead => lead), userId);
  } catch (error) {
    console.error('Failed to import leads from API:', error);
    throw new Error('Failed to import leads from external API');
  }
}

async function saveLeads(externalLeads: z.infer<typeof externalLeadSchema>[], userId: number) {
  const oneMonthFromNow = new Date();
  oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

  const leadsToInsert = externalLeads.map(lead => ({
    user_id: userId,
    title: lead.title,
    description: lead.description,
    category: lead.category || 'Other',
    subcategory: 'Imported',
    budget: lead.budget || null,
    location: lead.location || null,
    status: 'open',
    region: getCountryFromLocation(lead.location || '') || 'GB',
    expires_at: oneMonthFromNow,
  }));

  return await db.insert(leads).values(leadsToInsert).returning();
}

function extractCategory(text: string): string {
  const commonCategories = [
    'IT & Software Development',
    'Marketing & Advertising',
    'Business Services',
    'Professional Services',
  ];

  const found = commonCategories.find(category => 
    text.toLowerCase().includes(category.toLowerCase())
  );

  return found || 'Other';
}

function extractLocation(text: string): string | null {
  // Common location patterns
  const ukPattern = /(London|Manchester|Birmingham|Leeds|Glasgow|Edinburgh|Cardiff|Belfast)(?:,\s*(?:UK|United Kingdom|GB|Great Britain))?/i;
  const usPattern = /([A-Z][a-z]+(?:[\s-][A-Z][a-z]+)*),\s*(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)/i;

  const ukMatch = text.match(ukPattern);
  const usMatch = text.match(usPattern);

  return ukMatch?.[0] || usMatch?.[0] || null;
}

function extractBudget(content: string): number | null {
  // Look for currency amounts
  const budgetMatch = content.match(/(?:£|\$|EUR|USD)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
  if (budgetMatch) {
    return parseInt(budgetMatch[1].replace(/,/g, ''));
  }
  return null;
}