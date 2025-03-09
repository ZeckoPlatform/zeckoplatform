import winston from 'winston';
import { log as viteLog } from '../vite';

// Create custom format for structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.metadata({
    fillWith: ['timestamp', 'level', 'message', 'service', 'category']
  }),
  winston.format.json()
);

// Create Winston logger with console transport
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: structuredFormat,
  defaultMeta: { service: 'zecko-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Wrapper functions for categorized logging
export function logRequest(message: string, meta?: any) {
  const metadata = {
    ...meta,
    category: 'request'
  };
  logger.info(message, metadata);
  viteLog(`[REQUEST] ${message}`);
}

export function logError(message: string, meta?: any) {
  const metadata = {
    ...meta,
    category: 'error'
  };
  logger.error(message, metadata);
  viteLog(`[ERROR] ${message}`);
}

export function logSystem(message: string, meta?: any) {
  const metadata = {
    ...meta,
    category: 'system'
  };
  logger.info(message, metadata);
  viteLog(`[SYSTEM] ${message}`);
}

// For backward compatibility
export const logInfo = logSystem;

// Export logger instance for direct use if needed
export { logger };
