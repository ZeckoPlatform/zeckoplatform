import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { Server, createServer } from "http";
import { setupAuth } from "./auth";
import { logInfo, logError } from "./services/logging";
import { initializeMonitoring } from "./services/monitoring";
import { initializeAnalytics } from "./routes/analytics";
import cors from 'cors';
import { performance } from 'perf_hooks';
import { sql } from "drizzle-orm";

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// Start timing server initialization
const startTime = performance.now();
let lastCheckpoint = startTime;

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
logTiming('Basic middleware setup');

// Create HTTP server early to allow Vite to attach its WebSocket handler
const httpServer = createServer(app);

// Define ports clearly
const API_PORT = Number(process.env.PORT) || 5000;
const DEV_SERVER_PORT = Number(process.env.VITE_PORT) || 5173;

// Setup development mode
if (!isProd) {
  logInfo('Setting up Vite development server', {
    api_port: API_PORT,
    dev_server_port: DEV_SERVER_PORT,
    node_env: process.env.NODE_ENV
  });

  try {
    // Setup Vite with enhanced error logging
    await setupVite(app, httpServer);
    logTiming('Vite setup');

    // Add basic CORS for development
    app.use(cors({
      origin: true,
      credentials: true
    }));

  } catch (error) {
    logError('Failed to setup Vite:', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
} else {
  // Production setup
  logInfo('Setting up production static file serving');
  app.use(serveStatic);
  logTiming('Production static serving setup');
}

// Database initialization
console.log('Initializing database connection...');
try {
  const { db } = await import('@db');
  await db.execute(sql`SELECT 1`);
  console.log('Database initialization completed');
  logTiming('Database initialization');
} catch (error) {
  logError('Database initialization failed:', {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
}

// Initialize authentication
try {
  setupAuth(app);
  logTiming('Authentication setup');
} catch (error) {
  logError('Auth setup failed:', {
    error: error instanceof Error ? error.message : String(error)
  });
}

// Register API routes
try {
  registerRoutes(app);
  logTiming('Routes registration');
} catch (error) {
  logError('Fatal error during route registration:', {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
}

// Start server with enhanced logging
httpServer.listen(API_PORT, '0.0.0.0', () => {
  logTiming('Server startup complete');
  const duration = performance.now() - startTime;

  logInfo('Server started successfully', {
    port: API_PORT,
    environment: process.env.NODE_ENV,
    node_version: process.version,
    startup_duration_ms: duration.toFixed(2),
    vite_allowed_hosts: process.env.VITE_ALLOWED_HOSTS || 'all'
  });

  // Initialize background services
  Promise.allSettled([
    initializeMonitoring(),
    initializeAnalytics()
  ]).then(() => {
    logInfo('Background services initialization completed');
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