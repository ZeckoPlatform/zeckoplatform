import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { Server } from "http";
import { db } from "@db";
import { sql } from "drizzle-orm";

const app = express();
const isProd = app.get('env') === 'production';

// Global error handlers
process.on('uncaughtException', (error) => {
  log('Uncaught Exception:', error instanceof Error ? error.stack : String(error));
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Startup logging
log('=== Server Initialization Started ===');
log(`Environment: ${process.env.NODE_ENV}`);
log(`Process ID: ${process.pid}`);

// Add test endpoint for quick connectivity check
app.get('/api/healthtest', async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT NOW()`);
    res.json({ 
      status: "ok",
      timestamp: new Date().toISOString(),
      database: "connected"
    });
  } catch (error) {
    log('Health test failed:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ 
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API-specific middleware - only apply to /api routes
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// CORS middleware - only apply to /api routes
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

// Create HTTP server and register routes
log('Registering routes...');
const httpServer = registerRoutes(app);
log('Routes registered successfully');

// Setup static/Vite serving for frontend routes
if (isProd) {
  log('Setting up production static file serving');
  serveStatic(app);
} else {
  // Temporarily disable Vite for debugging
  log('Development mode: Basic server setup without Vite');
  app.get('/', (req, res) => {
    res.json({ message: 'Server is running in development mode' });
  });
}

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  log('Error handler:', err instanceof Error ? err.stack : String(err));

  if (res.headersSent) {
    return next(err);
  }

  // Send JSON responses for API routes
  if (req.path.startsWith('/api')) {
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || 'An unexpected error occurred'
    });
  }

  // Send HTML error for frontend routes
  res.status(500).send('Internal Server Error');
});

// Start server
const PORT = Number(process.env.PORT) || 5000;
log(`Starting server on port ${PORT}`);

httpServer.listen(PORT, '0.0.0.0', () => {
  log(`Server is running on port ${PORT}`);
});

// Handle server errors
httpServer.on('error', (error: NodeJS.ErrnoException) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof PORT === 'string'
    ? 'Pipe ' + PORT
    : 'Port ' + PORT;

  switch (error.code) {
    case 'EACCES':
      log(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      log(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});