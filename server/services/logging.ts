import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';
import { log as viteLog } from '../vite';
import { esClient, checkElasticsearchHealth } from '../elasticsearch';

// Store recent logs in memory when in console mode
const recentLogs: any[] = [];
const MAX_RECENT_LOGS = 100;

// Create custom format for structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.metadata({
    fillWith: ['timestamp', 'level', 'message', 'service', 'category', 'traceId']
  }),
  winston.format.json()
);

// Create custom transport for storing logs in memory
class MemoryTransport extends winston.Transport {
  constructor(opts?: any) {
    super(opts);
  }

  log(info: any, callback: () => void) {
    try {
      const logEntry = {
        '@timestamp': new Date().toISOString(),
        timestamp: new Date().toISOString(), // For backward compatibility
        level: info.level,
        message: info.message,
        service: info.service || 'zecko-api',
        category: info.metadata?.category || 'system',
        metadata: info.metadata || {}
      };

      recentLogs.unshift(logEntry);
      while (recentLogs.length > MAX_RECENT_LOGS) {
        recentLogs.pop();
      }
      callback();
    } catch (error) {
      callback();
      console.error('Error in memory transport:', error);
    }
  }
}

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

// Add memory transport
logger.add(new MemoryTransport());

// Add Elasticsearch transport if available
if (esClient && process.env.LOGGING_MODE !== 'console') {
  const esTransport = new ElasticsearchTransport({
    client: esClient,
    level: 'info',
    indexPrefix: 'zecko-logs',
    indexSuffixPattern: 'YYYY.MM.DD',
    handleExceptions: true,
    indexTemplate: {
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
  viteLog('[INFO] Elasticsearch transport added to logger');
} else {
  viteLog('[INFO] Running with console logging only');
}

// Structured logging interface
interface LogMetadata {
  category?: string;
  traceId?: string;
  [key: string]: any;
}

// Get recent logs (for console mode)
export function getRecentLogs() {
  return recentLogs;
}

// Logging categories
export enum LogCategory {
  REQUEST = 'request',
  ERROR = 'error',
  BUSINESS = 'business',
  SYSTEM = 'system'
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

// For backward compatibility and general logging
export const logInfo = logSystem;

// Export logger instance for direct use if needed
export { logger };

// Initialize logging but don't block on errors
if (process.env.NODE_ENV !== 'production') {
  process.env.LOGGING_MODE = 'console';
  logSystem('Application startup complete', {
    metadata: {
      startupTime: new Date().toISOString(),
      mode: process.env.LOGGING_MODE,
      environment: process.env.NODE_ENV
    }
  });
}