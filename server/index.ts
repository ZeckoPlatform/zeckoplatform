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

// We'll keep development mode for now until build is fixed
const isProd = process.env.NODE_ENV === 'production';

// Start timing server initialization
const startTime = performance.now();
let lastCheckpoint = startTime;

// Log environment diagnostics
logInfo('Starting server with diagnostics:', {
  node_version: process.version,
  environment: process.env.NODE_ENV,
  platform: process.platform,
  arch: process.arch,
  memory: process.memoryUsage(),
  env_vars: {
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    VITE_ALLOWED_HOSTS: process.env.VITE_ALLOWED_HOSTS
  }
});

function logTiming(step: string) {
  const now = performance.now();
  const stepDuration = now - lastCheckpoint;
  const totalDuration = now - startTime;
  logInfo(`Startup timing - ${step}`, {
    step,
    stepDuration: `${stepDuration.toFixed(2)}ms`,
    totalDuration: `${totalDuration.toFixed(2)}ms`
  });
  lastCheckpoint = now;
}

// Enhanced CORS configuration for development
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      callback(null, true);
      return;
    }

    const allowedHost = process.env.VITE_ALLOWED_HOSTS;
    if (allowedHost && (origin.includes(allowedHost) || origin === 'null')) {
      callback(null, true);
    } else {
      logError('CORS blocked request from origin:', { origin });
      callback(new Error('CORS policy: Origin not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));
logTiming('Basic middleware setup');

// Create HTTP server
const httpServer = createServer(app);

// Setup development mode with enhanced error handling
if (!isProd) {
  logInfo('Setting up development environment');
  try {
    await setupVite(app, httpServer);
    logTiming('Vite setup complete');
  } catch (error) {
    logError('Failed to setup Vite:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
} else {
  try {
    logInfo('Setting up production static serving');
    app.use(serveStatic);
    logTiming('Static serving setup');
  } catch (error) {
    logError('Failed to setup static serving:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
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