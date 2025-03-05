import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';
import { Client } from '@elastic/elasticsearch';
import { log as viteLog } from '../vite';
import { esClient } from '../elasticsearch';

// Create custom format for structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.metadata({
    fillWith: ['timestamp', 'level', 'message', 'service', 'category', 'traceId']
  }),
  winston.format.json()
);

// Create Winston logger with console transport initially
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
    })
  ]
});

// Add Elasticsearch transport with retry logic
const esTransport = new ElasticsearchTransport({
  client: esClient,
  level: 'info',
  indexPrefix: 'zecko-logs',
  indexSuffixPattern: 'YYYY.MM.DD',
  retryLimit: 5,
  retryDelay: 1000,
  handleExceptions: true,
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
});

// Handle transport errors
esTransport.on('error', (error) => {
  console.error('Elasticsearch transport error:', error);
  viteLog('[ERROR] Elasticsearch transport error - falling back to console logging');
});

// Add transport after error handler is set up
logger.add(esTransport);

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

// Initialize logging and test connection
testLogging().catch(error => {
  console.error('Failed to initialize logging:', error);
  viteLog('[ERROR] Failed to initialize logging system');
});