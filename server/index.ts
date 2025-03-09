import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { createServer } from "http";
import { setupAuth } from "./auth";
import { logInfo, logError } from "./services/logging";
import { initializeMonitoring } from "./services/monitoring";
import { initializeAnalytics } from "./routes/analytics";
import cors from 'cors';
import { performance } from 'perf_hooks';
import { sql } from "drizzle-orm";
import path from 'path';

const app = express();

// Start timing server initialization
const startTime = performance.now();
let lastCheckpoint = startTime;

// Log environment diagnostics
logInfo('Starting server:', {
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
    totalDuration: `${totalDuration.toFixed(2)}ms`
  });
  lastCheckpoint = now;
}

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Create HTTP server
const httpServer = createServer(app);

// Development mode - serve client files directly
if (process.env.NODE_ENV !== 'production') {
  logInfo('Setting up development static file serving');

  // Serve public assets
  app.use(express.static(path.join(process.cwd(), 'client', 'public')));

  // Serve client source files with proper MIME types
  app.use('/src', express.static(path.join(process.cwd(), 'client', 'src'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
    }
  }));

  // Serve index.html for client-side routing
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(process.cwd(), 'client', 'index.html'));
  });
} else {
  // Production mode - serve from dist
  logInfo('Setting up production server');
  app.use(express.static(path.join(process.cwd(), 'dist', 'public')));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(process.cwd(), 'dist', 'public', 'index.html'));
  });
}

logTiming('Server setup');

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
  await setupAuth(app);
  logTiming('Authentication setup');
} catch (error) {
  logError('Auth setup failed:', {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
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

// Start server with proper host binding
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Always bind to all interfaces

httpServer.listen(PORT, HOST, () => {
  logTiming('Server startup complete');
  logInfo('Server started successfully', {
    host: HOST,
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