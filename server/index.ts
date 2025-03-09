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
import { createProxyMiddleware } from 'http-proxy-middleware';

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

// CORS configuration section
app.use(cors({
  origin: function(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // In development mode, accept all origins
    if (!isProd) {
      return callback(null, true);
    }

    // In production, use strict allowlist from environment variable
    const allowedHosts = process.env.VITE_ALLOWED_HOSTS?.split(',') || [];
    if (allowedHosts.some(host => origin.includes(host))) {
      return callback(null, true);
    }

    // Log blocked origins in development for debugging
    if (!isProd) {
      logInfo('Blocked origin:', { origin });
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

// Create HTTP server early to allow Vite to attach its WebSocket handler
const httpServer = createServer(app);

// Initialize database connection
console.log('Initializing database connection...');
try {
  const { db } = await import('@db');
  // Test the connection
  await db.execute(sql`SELECT 1`);
  console.log('Database initialization completed');
  logTiming('Database initialization');
} catch (error) {
  logError('Database initialization failed:', {
    error: error instanceof Error ? error.message : String(error),
    duration: performance.now() - lastCheckpoint
  });
  process.exit(1);
}

// Setup frontend serving - do this before other middleware
if (isProd) {
  logInfo('Setting up production static file serving');
  app.use(serveStatic);
  logTiming('Production static serving setup');
} else {
  // Setup Vite in development mode
  logInfo('Setting up Vite development server');
  await setupVite(app, httpServer);
  logTiming('Vite setup');

  // Development proxy configuration for API requests
  app.use('/api', createProxyMiddleware({
    target: `http://localhost:${process.env.PORT || 5000}`,
    changeOrigin: true,
    ws: true,
    onError: (err: Error, req: Request, res: Response) => {
      logError('Proxy error:', {
        error: err.message,
        path: req.path,
        method: req.method
      });
      res.writeHead(500, {
        'Content-Type': 'text/plain'
      });
      res.end('Proxy Error');
    }
  }));

  // Handle Vite HMR WebSocket connections separately
  app.use('/__vite_hmr', createProxyMiddleware({
    target: `ws://localhost:${process.env.PORT || 5000}`,
    ws: true,
    changeOrigin: true,
    logLevel: 'silent'
  }));
}

// Initialize authentication
try {
  setupAuth(app);
  logTiming('Authentication setup');
} catch (error) {
  logError('Auth setup failed:', {
    error: error instanceof Error ? error.message : String(error),
    duration: performance.now() - lastCheckpoint
  });
}

// Register API routes
try {
  registerRoutes(app);
  logTiming('Routes registration');
} catch (error) {
  logError('Fatal error during route registration:', {
    error: error instanceof Error ? error.message : String(error),
    duration: performance.now() - lastCheckpoint
  });
  process.exit(1);
}

// Start server
const PORT = Number(process.env.PORT) || 5000;
httpServer.listen(PORT, '0.0.0.0', () => {
  logTiming('Server startup complete');
  logInfo(`Server started successfully on port ${PORT}`, {
    totalStartupTime: `${(performance.now() - startTime).toFixed(2)}ms`,
    allowedHosts: process.env.VITE_ALLOWED_HOSTS
  });

  // Initialize monitoring and analytics in the background
  Promise.allSettled([
    initializeMonitoring().catch(error => {
      logError('Monitoring initialization failed (non-critical):', {
        error: error instanceof Error ? error.message : String(error)
      });
    }),
    initializeAnalytics().catch(error => {
      logError('Analytics initialization failed (non-critical):', {
        error: error instanceof Error ? error.message : String(error)
      });
    })
  ]).then(() => {
    logInfo('Background services initialization completed');
  });
});

// Handle process termination
process.on('SIGTERM', () => {
  logInfo('Received SIGTERM signal, shutting down gracefully');
  httpServer.close(() => {
    logInfo('HTTP server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  logError('Uncaught Exception:', {
    error: error instanceof Error ? error.message : String(error),
    stack: error.stack,
    uptime: `${(performance.now() - startTime).toFixed(2)}ms`
  });
  process.exit(1);
});