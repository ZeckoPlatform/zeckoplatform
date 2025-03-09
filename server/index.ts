import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";
import { createServer } from "http";
import { setupAuth } from "./auth";
import { logInfo, logError } from "./services/logging";
import path from 'path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';

const app = express();

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create HTTP server
const httpServer = createServer(app);

// Development mode - use Vite
if (process.env.NODE_ENV !== 'production') {
  logInfo('Starting development server setup', {
    mode: 'development',
    vite_config: {
      host: process.env.VITE_HOST,
      port: process.env.VITE_PORT,
      allowed_hosts: process.env.VITE_ALLOWED_HOSTS
    }
  });

  try {
    // Initialize Vite with minimal configuration
    await setupVite(app, httpServer);
    logInfo('Development server setup complete');
  } catch (error) {
    logError('Development server setup failed:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

// Initialize database
try {
  const { db } = await import('@db');
  // Simple health check query
  await db.execute(eq(1, 1));
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

// Register routes
try {
  registerRoutes(app);
  logInfo('Routes registered successfully');
} catch (error) {
  logError('Route registration failed:', {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
}

// Detailed error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const errorDetails = {
    message: err.message,
    type: err.constructor.name,
    path: req.path,
    method: req.method,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  };

  logError('Request error:', errorDetails);

  res.status(500).json({
    error: process.env.NODE_ENV === 'development' 
      ? errorDetails 
      : 'Internal server error'
  });
});

// Start server
const PORT = Number(process.env.PORT) || 5000;
const HOST = '0.0.0.0';

httpServer.listen(PORT, HOST, () => {
  logInfo('Server started successfully', {
    host: HOST,
    port: PORT,
    mode: process.env.NODE_ENV,
    vite_status: process.env.NODE_ENV === 'development' ? 'enabled' : 'disabled'
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