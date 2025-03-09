// This file is deprecated and not in use
// Keeping as a placeholder for future implementation if needed
export const esClient = null;

export async function testElasticsearchConnection() {
  return false;
}

export async function checkElasticsearchHealth() {
  return {
    available: false,
    reason: 'Elasticsearch is disabled',
    mode: 'console'
  };
}