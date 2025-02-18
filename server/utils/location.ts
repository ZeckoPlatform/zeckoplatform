const UK_INDICATORS = ['UK', 'GB', 'United Kingdom', 'England', 'Scotland', 'Wales', 'Northern Ireland'];
const US_INDICATORS = ['US', 'USA', 'United States', 'America'];

export function getCountryFromLocation(location: string): 'GB' | 'US' | null {
  const upperLocation = location.toUpperCase();
  
  if (UK_INDICATORS.some(indicator => upperLocation.includes(indicator.toUpperCase()))) {
    return 'GB';
  }
  
  if (US_INDICATORS.some(indicator => upperLocation.includes(indicator.toUpperCase()))) {
    return 'US';
  }
  
  return null;
}
