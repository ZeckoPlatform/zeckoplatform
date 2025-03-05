import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { Server, createServer } from "http";
import { setupAuth } from "./auth";
import { logInfo, logError } from "./services/logging";
import { initializeMonitoring } from "./services/monitoring";
import { checkPerformanceMetrics } from "./services/admin-notifications";

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// Startup logging
logInfo('=== Server Initialization Started ===', {
  environment: process.env.NODE_ENV,
  processId: process.pid
});

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API middleware for consistent JSON responses
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Setup CORS for API routes
app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Initialize authentication first
setupAuth(app);

// Register API routes
try {
  registerRoutes(app);
  logInfo('Routes registered successfully');
} catch (error) {
  logError('Fatal error during route registration:', {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
}

// Create HTTP server
const httpServer = createServer(app);
log('Created HTTP server instance');

// Initialize monitoring
try {
  initializeMonitoring();
  logInfo('Monitoring system initialized successfully');
} catch (error) {
  logError('Failed to initialize monitoring:', {
    error: error instanceof Error ? error.message : String(error)
  });
  // Continue server startup even if monitoring fails
}


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
} else {
  // Handle development mode with Vite
  logInfo('Setting up Vite development server');
  (async () => {
    try {
      await setupVite(app, httpServer);
      logInfo('Vite setup completed successfully');
    } catch (error) {
      logError('Fatal error during Vite setup:', {
        error: error instanceof Error ? error.message : String(error)
      });
      process.exit(1);
    }
  })();
}

// Start server
const PORT = Number(process.env.PORT) || 5000;
httpServer.listen(PORT, '0.0.0.0', () => {
  logInfo('Server started successfully on port ' + PORT);
});

// Schedule periodic performance checks
const PERFORMANCE_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
setInterval(() => {
  checkPerformanceMetrics().catch(error => {
    logError('Failed to run performance check:', {
      error: error instanceof Error ? error.message : String(error)
    });
  });
}, PERFORMANCE_CHECK_INTERVAL);

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
    stack: error.stack
  });
  process.exit(1);
});