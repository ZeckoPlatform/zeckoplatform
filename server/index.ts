// Configure Vite host settings before anything else
process.env.DANGEROUSLY_DISABLE_HOST_CHECK = "true";
process.env.VITE_ALLOW_ORIGIN = "*";
process.env.VITE_DEV_SERVER_HOSTNAME = "0.0.0.0";
process.env.VITE_HMR_HOST = process.env.REPL_SLUG + "." + process.env.REPL_OWNER + ".repl.co";
process.env.VITE_HMR_PROTOCOL = "wss";

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { Server, createServer } from "http";
import { setupAuth } from "./auth";
import { logInfo, logError } from "./services/logging";
import { initializeMonitoring } from "./services/monitoring";

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

// Setup CORS - Allow all origins in development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Cross-Origin-Opener-Policy', 'same-origin');
  res.header('Cross-Origin-Embedder-Policy', 'require-corp');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Setup auth before routes
setupAuth(app);

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

// Register API routes before setting up frontend serving
try {
  registerRoutes(app);
  logInfo('Routes registered successfully');
} catch (error) {
  logError('Fatal error during route registration:', {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
}

// Handle frontend serving
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
  // Development mode with Vite
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

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logError('Unhandled error:', {
    error: err.message,
    stack: err.stack
  });
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = Number(process.env.PORT) || 5000;
httpServer.listen(PORT, '0.0.0.0', () => {
  logInfo(`Server started successfully on port ${PORT}`);
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
    stack: error.stack
  });
  process.exit(1);
});