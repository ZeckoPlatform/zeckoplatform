import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "http";
import { setupAuth } from "./auth";
import { logInfo, logError } from "./services/logging";
import { sql } from 'drizzle-orm';

// Global error handlers
process.on('uncaughtException', (err) => {
  logError('Uncaught Exception:', {
    error: err.message,
    stack: err.stack
  });
});

process.on('unhandledRejection', (reason) => {
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
    error: error instanceof Error ? error.message : String(error)
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

// Handle static files in production or setup Vite in development
if (process.env.NODE_ENV === 'production') {
  try {
    serveStatic(app);
    logInfo('Static file serving initialized');
  } catch (error) {
    logError('Failed to initialize static serving:', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
} else {
  try {
    await setupVite(app, httpServer);
    logInfo('Vite development server initialized');
  } catch (error) {
    logError('Failed to initialize Vite:', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
}

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

// Start server
const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

httpServer.listen(PORT, HOST, () => {
  logInfo('Server started successfully', {
    host: HOST,
    port: PORT,
    mode: process.env.NODE_ENV
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