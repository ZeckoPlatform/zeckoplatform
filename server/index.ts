import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./vite";
import { Server, createServer } from "http";
import { setupAuth } from "./auth";
import { logInfo, logError } from "./services/logging";
import { initializeMonitoring } from "./services/monitoring";
import { initializeAnalytics } from "./routes/analytics";
import cors from 'cors';
import { performance } from 'perf_hooks';
import { sql } from "drizzle-orm";

const app = express();

// Force production mode
process.env.NODE_ENV = 'production';
const isProd = true;

// Start timing server initialization
const startTime = performance.now();
let lastCheckpoint = startTime;

// Log environment diagnostics
logInfo('Starting server in production mode:', {
  node_version: process.version,
  environment: process.env.NODE_ENV,
  platform: process.platform,
  arch: process.arch,
  memory: process.memoryUsage()
});

function logTiming(step: string) {
  const now = performance.now();
  const stepDuration = now - lastCheckpoint;
  const totalDuration = now - startTime;
  logInfo(`Startup timing - ${step}`, {
    step,
    stepDuration: `${stepDuration.toFixed(2)}ms`,
    totalDuration: `${totalDuration.toFixed(2)}ms`,
    timestamp: new Date().toISOString()
  });
  lastCheckpoint = now;
}

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors()); // Added cors middleware

// Create HTTP server
const httpServer = createServer(app);

// Setup production static file serving
logInfo('Setting up production static file serving');
app.use(serveStatic);
logTiming('Static serving setup');

// Initialize database
try {
  const { db } = await import('@db');
  await db.execute(sql`SELECT 1`);
  logInfo('Database connection successful');
  logTiming('Database initialization');
} catch (error) {
  logError('Database initialization failed:', {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
}

// Setup authentication
try {
  setupAuth(app);
  logTiming('Authentication setup');
} catch (error) {
  logError('Auth setup failed:', {
    error: error instanceof Error ? error.message : String(error)
  });
}

// Register routes
try {
  registerRoutes(app);
  logTiming('Routes registration');
} catch (error) {
  logError('Route registration failed:', {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
}

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, '0.0.0.0', () => {
  logTiming('Server startup complete');
  logInfo('Server started successfully in production mode', {
    port: PORT,
    environment: process.env.NODE_ENV,
    startup_duration_ms: (performance.now() - startTime).toFixed(2)
  });

  // Initialize background services
  Promise.allSettled([
    initializeMonitoring(),
    initializeAnalytics()
  ]).then(() => {
    logInfo('Background services initialized');
  }).catch(error => {
    logError('Background services initialization error:', {
      error: error instanceof Error ? error.message : String(error)
    });
  });
});

// Error handling
process.on('uncaughtException', (error) => {
  logError('Uncaught Exception:', {
    error: error instanceof Error ? error.message : String(error),
    stack: error.stack
  });
  process.exit(1);
});

process.on('SIGTERM', () => {
  logInfo('Received SIGTERM signal, initiating graceful shutdown');
  httpServer.close(() => {
    logInfo('HTTP server closed');
    process.exit(0);
  });
});