import { Client } from '@elastic/elasticsearch';
import { log } from "./vite";

// Initialize Elasticsearch client
const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
});

// Export client instance for use in other modules
export { esClient };

// Test Elasticsearch connection
export async function testElasticsearchConnection() {
  try {
    const startTime = Date.now();
    const result = await Promise.race([
      esClient.ping(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      )
    ]);

    const connectionTime = Date.now() - startTime;
    log('Elasticsearch cluster is running:', {
      connected: true,
      responseTime: `${connectionTime}ms`,
      result
    });
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('Error connecting to Elasticsearch:', {
      error: errorMessage,
      url: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
    });
    // Don't throw error to prevent blocking app startup
    return false;
  }
}

// Call connection test on initialization but don't block
testElasticsearchConnection().then(connected => {
  if (!connected) {
    log('Warning: Elasticsearch is not available, logging will fall back to console only');
  }
}).catch(err => {
  log('Elasticsearch initialization error:', err);
});