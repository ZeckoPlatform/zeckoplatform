import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { createServer } from "http";
import { setupAuth } from "./auth";
import { logInfo, logError } from "./services/logging";
import path from 'path';
import { sql } from 'drizzle-orm';
import fs from 'fs';

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

// Setup static file serving
logInfo('Setting up static file serving', {
  mode: process.env.NODE_ENV,
  static_path: process.env.STATIC_PATH || 'client/public',
  cwd: process.cwd()
});

// Log directory access attempt
try {
  const stats = fs.statSync(process.cwd());
  logInfo('Current working directory access check:', {
    path: process.cwd(),
    readable: Boolean(stats.mode & fs.constants.R_OK),
    writable: Boolean(stats.mode & fs.constants.W_OK),
    executable: Boolean(stats.mode & fs.constants.X_OK)
  });
} catch (error) {
  logError('Failed to check working directory permissions:', {
    error: error instanceof Error ? error.message : String(error)
  });
}

// Serve a basic HTML page directly for all non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Zecko Platform</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        font-family: system-ui, -apple-system, sans-serif;
        margin: 0;
        padding: 2rem;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background: #f5f5f5;
      }
      .container {
        text-align: center;
        padding: 2rem;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      h1 { color: #333; margin-bottom: 1rem; }
      p { color: #666; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Welcome to Zecko Platform</h1>
      <p>The application is starting up...</p>
      <div id="root"></div>
    </div>
  </body>
</html>`;

  res.type('html').send(htmlContent);
});

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