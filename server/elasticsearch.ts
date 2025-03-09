import { Client } from '@elastic/elasticsearch';
import { log } from "./vite";

// Initialize Elasticsearch client with proper configuration
const shouldUseElasticsearch = process.env.LOGGING_MODE === 'elasticsearch';
const isProduction = process.env.NODE_ENV === 'production';

// Create Elasticsearch client with fallback options
export const esClient = shouldUseElasticsearch ? new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  requestTimeout: 5000,
  maxRetries: 3,
  ssl: {
    rejectUnauthorized: false // Only for development
  }
}) : null;

// Test Elasticsearch connection
export async function testElasticsearchConnection() {
  if (!shouldUseElasticsearch || !esClient) {
    log('Elasticsearch is disabled, using console logging');
    return false;
  }

  try {
    const startTime = Date.now();
    const result = await Promise.race([
      esClient.ping(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      )
    ]);

    const connectionTime = Date.now() - startTime;
    log(`Elasticsearch cluster is running (${connectionTime}ms)`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Elasticsearch connection failed: ${errorMessage}`);
    return false;
  }
}

// Health check function
export async function checkElasticsearchHealth() {
  if (!shouldUseElasticsearch || !esClient) {
    return { 
      available: false, 
      reason: 'Elasticsearch is disabled or not configured',
      mode: process.env.LOGGING_MODE || 'console'
    };
  }

  try {
    const result = await esClient.cluster.health();
    return {
      available: true,
      status: result.status,
      nodes: result.number_of_nodes,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      available: false,
      reason: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

// Initialize connection check without blocking
if (shouldUseElasticsearch && esClient) {
  testElasticsearchConnection()
    .then(connected => {
      if (!connected) {
        log('Elasticsearch unavailable - falling back to console logging');
      }
    })
    .catch(err => {
      log('Elasticsearch initialization error:', err instanceof Error ? err.message : String(err));
    });
}