import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";
import { createServer } from "http";
import { setupAuth } from "./auth";
import { logInfo, logError } from "./services/logging";
import path from 'path';
import { sql } from 'drizzle-orm';

// Global error handlers for better debugging
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  logError('Uncaught Exception:', {
    error: err.message,
    stack: err.stack
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  logError('Unhandled Rejection:', {
    reason: reason instanceof Error ? reason.message : String(reason)
  });
});

const app = express();

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create HTTP server
const httpServer = createServer(app);

// Initialize database
try {
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

// Register API routes first
try {
  registerRoutes(app);
  logInfo('Routes registered successfully');
} catch (error) {
  logError('Route registration failed:', {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
}

// Setup Vite in development mode
if (process.env.NODE_ENV !== 'production') {
  try {
    await setupVite(app, httpServer);
    logInfo('Vite development server initialized successfully');
  } catch (error) {
    logError('Failed to initialize Vite:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
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
    environment: process.env.NODE_ENV,
    static_serving: true
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