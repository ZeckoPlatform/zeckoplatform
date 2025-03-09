import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "http";
import { setupAuth } from "./auth";
import { logInfo, logError } from "./services/logging";
import { sql } from 'drizzle-orm';
import path from 'path';

const app = express();

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create HTTP server
const httpServer = createServer(app);

// Log environment variables for debugging
logInfo('Starting server with configuration:', {
  env: process.env.NODE_ENV,
  bypass_vite: process.env.BYPASS_VITE,
  vite_allowed_hosts: process.env.VITE_ALLOWED_HOSTS,
  vite_dev_server_hostname: process.env.VITE_DEV_SERVER_HOSTNAME,
  vite_force_dev_server: process.env.VITE_FORCE_DEV_SERVER,
  host_url: process.env.HOST_URL
});

// Initialize database
try {
  logInfo('Attempting database connection...');
  const { db } = await import('@db');
  await db.execute(sql`SELECT 1 as health_check`);
  logInfo('Database connection successful');
} catch (error) {
  logError('Database initialization failed:', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });
  process.exit(1);
}

// Setup authentication
try {
  await setupAuth(app);
  logInfo('Authentication setup complete');
} catch (error) {
  logError('Auth setup failed:', {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
}

// Register API routes
try {
  registerRoutes(app);
  logInfo('Routes registered successfully');
} catch (error) {
  logError('Route registration failed:', {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
}

// Add health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    bypass_vite: process.env.BYPASS_VITE === 'true',
    vite_allowed_hosts: process.env.VITE_ALLOWED_HOSTS
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logError('Request error:', {
    message: err.message,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Log before Vite setup
logInfo('Preparing to initialize Vite...', {
  bypass_vite: process.env.BYPASS_VITE === 'true',
  vite_allowed_hosts: process.env.VITE_ALLOWED_HOSTS
});

// Handle frontend serving based on environment and bypass flag
if (process.env.NODE_ENV === 'development') {
  try {
    logInfo('Initializing Vite development server...');

    // Serve static content first
    app.use(express.static(path.join(process.cwd(), 'public')));

    // Then initialize Vite
    await setupVite(app, httpServer);
    logInfo('Vite development server initialized');
  } catch (error) {
    logError('Failed to initialize Vite:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
} else {
  // Production mode
  try {
    serveStatic(app);
    logInfo('Static file serving initialized');
  } catch (error) {
    logError('Failed to initialize static serving:', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
}

// Start server
const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

httpServer.listen(PORT, HOST, () => {
  logInfo('Server started successfully', {
    host: HOST,
    port: PORT,
    mode: process.env.NODE_ENV,
    bypass_vite: process.env.BYPASS_VITE === 'true',
    vite_allowed_hosts: process.env.VITE_ALLOWED_HOSTS
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logInfo('Received SIGTERM signal, initiating graceful shutdown');
  httpServer.close(() => {
    logInfo('HTTP server closed');
    process.exit(0);
  });
});