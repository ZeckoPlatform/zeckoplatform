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

// Log environment diagnostics
logInfo('Starting server with environment:', {
  node_version: process.version,
  environment: process.env.NODE_ENV,
  platform: process.platform,
  arch: process.arch,
  memory: process.memoryUsage(),
  env_vars: {
    PORT: process.env.PORT,
    VITE_PORT: process.env.VITE_PORT,
    VITE_ALLOWED_HOSTS: process.env.VITE_ALLOWED_HOSTS,
    NODE_ENV: process.env.NODE_ENV
  }
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

// Basic middleware setup with enhanced headers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set security headers
app.use((req, res, next) => {
  // Allow Vite dev server
  if (process.env.VITE_ALLOWED_HOSTS) {
    res.setHeader('Access-Control-Allow-Origin', `https://${process.env.VITE_ALLOWED_HOSTS}`);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// Development mode CORS configuration
if (!isProd) {
  app.use(cors({
    origin: process.env.VITE_ALLOWED_HOSTS ? `https://${process.env.VITE_ALLOWED_HOSTS}` : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));
}

logTiming('Basic middleware setup');

// Create HTTP server
const httpServer = createServer(app);

// Setup development mode
if (!isProd) {
  logInfo('Setting up development environment', {
    host: '0.0.0.0',
    port: process.env.PORT || 5000,
    allowed_hosts: process.env.VITE_ALLOWED_HOSTS || 'all'
  });

  try {
    await setupVite(app, httpServer);
    logTiming('Vite setup complete');
  } catch (error) {
    logError('Failed to setup Vite:', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
} else {
  logInfo('Setting up production environment');
  app.use(serveStatic);
  logTiming('Static serving setup');
}

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
  logInfo('Server started successfully', {
    port: PORT,
    environment: process.env.NODE_ENV,
    node_version: process.version,
    startup_duration_ms: (performance.now() - startTime).toFixed(2),
    vite_allowed_hosts: process.env.VITE_ALLOWED_HOSTS || 'all'
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