import winston from 'winston';
import { log as viteLog } from '../vite';

// Store recent logs in memory when in console mode
const recentLogs: any[] = [];
const MAX_LOGS = 1000;

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

// Helper to add log to recent logs array
function addToRecentLogs(level: string, message: string, meta?: any) {
  const logEntry = {
    '@timestamp': new Date().toISOString(),
    level,
    message,
    service: 'zecko-api',
    category: meta?.category || 'system',
    metadata: meta
  };

  recentLogs.unshift(logEntry);
  if (recentLogs.length > MAX_LOGS) {
    recentLogs.pop();
  }

  return logEntry;
}

// Wrapper functions for categorized logging
export function logRequest(message: string, meta?: any) {
  const metadata = {
    ...meta,
    category: 'request'
  };
  logger.info(message, metadata);
  addToRecentLogs('info', message, metadata);
  viteLog(`[REQUEST] ${message}`);
}

export function logError(message: string, meta?: any) {
  const metadata = {
    ...meta,
    category: 'error'
  };
  logger.error(message, metadata);
  addToRecentLogs('error', message, metadata);
  viteLog(`[ERROR] ${message}`);
}

export function logSystem(message: string, meta?: any) {
  const metadata = {
    ...meta,
    category: 'system'
  };
  logger.info(message, metadata);
  addToRecentLogs('info', message, metadata);
  viteLog(`[SYSTEM] ${message}`);
}

// For backward compatibility
export const logInfo = logSystem;

// Export function to get recent logs
export function getRecentLogs() {
  return recentLogs;
}

// Export logger instance for direct use if needed
export { logger };