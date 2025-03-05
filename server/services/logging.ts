import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';
import { Client } from '@elastic/elasticsearch';
import { log as viteLog } from '../vite';

// Initialize Elasticsearch client
const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
});

// Create custom format for structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.metadata({
    fillWith: ['timestamp', 'level', 'message', 'service', 'category', 'traceId']
  }),
  winston.format.json()
);

// Create Winston logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: structuredFormat,
  defaultMeta: { service: 'zecko-api' },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // Elasticsearch transport
    new ElasticsearchTransport({
      client: esClient,
      level: 'info',
      indexPrefix: 'zecko-logs',
      indexSuffixPattern: 'YYYY.MM.DD',
      mappingTemplate: {
        index_patterns: ['zecko-logs-*'],
        settings: {
          number_of_shards: 1,
          number_of_replicas: 1,
          index: {
            refresh_interval: '5s'
          }
        },
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            level: { type: 'keyword' },
            message: { type: 'text' },
            service: { type: 'keyword' },
            category: { type: 'keyword' },
            traceId: { type: 'keyword' },
            metadata: { type: 'object' }
          }
        }
      }
    })
  ]
});

// Logging categories
export enum LogCategory {
  REQUEST = 'request',
  ERROR = 'error',
  BUSINESS = 'business',
  SYSTEM = 'system'
}

// Structured logging interface
interface LogMetadata {
  category: LogCategory;
  traceId?: string;
  [key: string]: any;
}

// Wrapper functions for categorized logging
export function logRequest(message: string, meta?: Partial<LogMetadata>) {
  const metadata = {
    ...meta,
    category: LogCategory.REQUEST
  };
  logger.info(message, metadata);
  viteLog(`[REQUEST] ${message}`);
}

export function logError(message: string, meta?: Partial<LogMetadata>) {
  const metadata = {
    ...meta,
    category: LogCategory.ERROR
  };
  logger.error(message, metadata);
  viteLog(`[ERROR] ${message}`);
}

export function logBusiness(message: string, meta?: Partial<LogMetadata>) {
  const metadata = {
    ...meta,
    category: LogCategory.BUSINESS
  };
  logger.info(message, metadata);
  viteLog(`[BUSINESS] ${message}`);
}

export function logSystem(message: string, meta?: Partial<LogMetadata>) {
  const metadata = {
    ...meta,
    category: LogCategory.SYSTEM
  };
  logger.info(message, metadata);
  viteLog(`[SYSTEM] ${message}`);
}

// Export logger instance for direct use if needed
export { logger };

// Test function to verify Elasticsearch connection and logging
export async function testLogging() {
  try {
    // Test system logging
    logSystem('Elasticsearch logging test initiated', {
      metadata: { test: true }
    });

    // Test request logging
    logRequest('Test API request', {
      method: 'GET',
      path: '/api/test',
      duration: 100
    });

    // Test business logging
    logBusiness('Test business action', {
      action: 'create_lead',
      userId: 123
    });

    // Test error logging
    logError('Test error occurred', {
      error: new Error('Test error'),
      code: 500
    });

    return true;
  } catch (error) {
    console.error('Logging test failed:', error);
    return false;
  }
}