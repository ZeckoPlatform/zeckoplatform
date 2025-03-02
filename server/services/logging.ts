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
    fillWith: ['timestamp', 'level', 'message', 'service']
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
    })
  ]
});

// Add Elasticsearch transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new ElasticsearchTransport({
    client: esClient,
    level: 'info',
    index: 'zecko-logs',
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
        dynamic_templates: [{
          strings_as_keywords: {
            match_mapping_type: 'string',
            mapping: {
              type: 'keyword'
            }
          }
        }]
      }
    }
  }));
}

// Wrapper function to ensure all logging goes through Winston
export function logMessage(level: string, message: string, meta?: any) {
  // Also log to Vite's logger for development visibility
  viteLog(`[${level}] ${message}`);
  
  // Log to Winston (and consequently Elasticsearch in production)
  logger.log(level, message, meta);
}

// Convenience methods for different log levels
export const logInfo = (message: string, meta?: any) => logMessage('info', message, meta);
export const logError = (message: string, meta?: any) => logMessage('error', message, meta);
export const logWarn = (message: string, meta?: any) => logMessage('warn', message, meta);
export const logDebug = (message: string, meta?: any) => logMessage('debug', message, meta);

// Export logger instance for direct use if needed
export { logger };
