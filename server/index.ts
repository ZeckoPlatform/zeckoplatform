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

// Check Node.js version compatibility
const requiredNodeVersion = '16.0.0';
const currentNodeVersion = process.versions.node;
if (compareVersions(currentNodeVersion, requiredNodeVersion) < 0) {
  logError("Node.js version incompatible:", {
    current: currentNodeVersion,
    required: requiredNodeVersion,
    suggestion: 'Please upgrade Node.js to version 16.0.0 or higher'
  });
  process.exit(1);
}

function compareVersions(a: string, b: string): number {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aVal = aParts[i] || 0;
    const bVal = bParts[i] || 0;
    if (aVal !== bVal) return aVal - bVal;
  }
  return 0;
}

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

// Enhanced CORS setup for development
app.use(cors({
  origin: function(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedHosts = process.env.VITE_ALLOWED_HOSTS?.split(',') || [];
    logInfo('CORS check for origin:', {
      origin,
      allowedHosts,
      hasAllowedHosts: !!process.env.VITE_ALLOWED_HOSTS
    });

    // More permissive CORS in development
    if (!isProd) {
      return callback(null, true);
    }

    // In production, strictly check against allowed hosts
    if (allowedHosts.some(allowedOrigin => origin?.includes(allowedOrigin))) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));
logTiming('CORS setup');

// Add proxy middleware for development
if (!isProd) {
  // Proxy API requests
  app.use('/api', createProxyMiddleware({
    target: `http://localhost:${process.env.PORT || 5000}`,
    changeOrigin: true,
    secure: false,
    ws: true, // Enable WebSocket proxy
    xfwd: true, // Add x-forward headers
    onProxyReq: (proxyReq: any, req: Request) => {
      // Add CORS headers
      proxyReq.setHeader('Access-Control-Allow-Origin', '*');
      proxyReq.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
      proxyReq.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      logInfo('Proxying request:', {
        path: req.path,
        method: req.method,
        origin: req.headers.origin
      });
    },
    onError: (err: Error, req: Request, res: Response) => {
      logError('Proxy error:', {
        error: err.message,
        path: req.path,
        method: req.method
      });
      // Don't throw on proxy errors, just log them
      res.writeHead(500, {
        'Content-Type': 'text/plain'
      });
      res.end('Proxy Error');
    }
  }));

  // Also proxy websocket connections
  app.use('/ws', createProxyMiddleware({
    target: `ws://localhost:${process.env.PORT || 5000}`,
    ws: true,
    changeOrigin: true
  }));
}

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

// Create HTTP server
const httpServer = createServer(app);
logTiming('HTTP server creation');

// Setup frontend serving
if (isProd) {
  logInfo('Setting up production static file serving');
  app.use(serveStatic);

  // Fallback route for SPA
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      logInfo(`Serving index.html for path: ${req.path}`);
      res.sendFile('index.html', { root: './client/dist' });
    }
  });
  logTiming('Production static serving setup');
} else {
  // Handle development mode with Vite
  logInfo('Setting up Vite development server');
  (async () => {
    try {
      await setupVite(app, httpServer);
      logTiming('Vite setup');
    } catch (error) {
      logError('Fatal error during Vite setup:', {
        error: error instanceof Error ? error.message : String(error),
        duration: performance.now() - lastCheckpoint
      });
      process.exit(1);
    }
  })();
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
  // Don't fail if they can't connect
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