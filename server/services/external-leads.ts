import axios from 'axios';
import { db } from "@db";
import { leads } from "@db/schema";
import { getCountryFromLocation } from '../utils/location';

interface ExternalLead {
  title: string;
  description: string;
  category?: string;
  budget?: number;
  location?: string;
}

export async function importLeadsFromRSS(url: string, userId: number) {
  try {
    const response = await axios.get(url);
    const parser = new (require('rss-parser'))();
    const feed = await parser.parseString(response.data);
    
    const importedLeads: ExternalLead[] = feed.items.map((item: any) => ({
      title: item.title,
      description: item.contentSnippet || item.content,
      category: item.categories?.[0] || 'Other',
      location: item.location || null,
      budget: extractBudget(item.content),
    }));

    return await saveLeads(importedLeads, userId);
  } catch (error) {
    console.error('Failed to import leads from RSS:', error);
    throw new Error('Failed to import leads from RSS feed');
  }
}

export async function importLeadsFromAPI(apiUrl: string, apiKey: string, userId: number) {
  try {
    const response = await axios.get(apiUrl, {
      headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : undefined
    });
    
    const importedLeads: ExternalLead[] = response.data.map((item: any) => ({
      title: item.title || item.name,
      description: item.description || item.details,
      category: item.category || 'Other',
      location: item.location,
      budget: typeof item.budget === 'number' ? item.budget : null,
    }));

    return await saveLeads(importedLeads, userId);
  } catch (error) {
    console.error('Failed to import leads from API:', error);
    throw new Error('Failed to import leads from external API');
  }
}

async function saveLeads(externalLeads: ExternalLead[], userId: number) {
  const oneMonthFromNow = new Date();
  oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

  const leadsToInsert = externalLeads.map(lead => ({
    user_id: userId,
    title: lead.title,
    description: lead.description,
    category: lead.category || 'Other',
    budget: lead.budget || null,
    location: lead.location || null,
    status: 'open',
    region: getCountryFromLocation(lead.location || '') || 'GB',
    expires_at: oneMonthFromNow,
  }));

  return await db.insert(leads).values(leadsToInsert).returning();
}

function extractBudget(content: string): number | null {
  // Simple budget extraction from text
  const budgetMatch = content.match(/\$(\d+,?\d*)/);
  if (budgetMatch) {
    return parseInt(budgetMatch[1].replace(',', ''));
  }
  return null;
}
