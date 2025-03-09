import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { logInfo, logError } from "./services/logging";
import { initializeMonitoring } from "./services/monitoring";
import { initializeAnalytics } from "./routes/analytics";
import cors from 'cors';
import { performance } from 'perf_hooks';
import { sql } from "drizzle-orm";
import path from 'path';

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// Start timing server initialization
const startTime = performance.now();
let lastCheckpoint = startTime;

// Log environment diagnostics
logInfo('Starting server with diagnostics:', {
  node_version: process.version,
  environment: process.env.NODE_ENV,
  platform: process.platform,
  arch: process.arch,
  memory: process.memoryUsage()
});

function logTiming(step: string) {
  const now = performance.now();
  const stepDuration = now - lastCheckpoint;
  const totalDuration = now - startTime;
  logInfo(`Startup timing - ${step}`, {
    step,
    stepDuration: `${stepDuration.toFixed(2)}ms`,
    totalDuration: `${totalDuration.toFixed(2)}ms`
  });
  lastCheckpoint = now;
}

// Configure permissive CORS for development
app.use(cors({
  origin: true,
  credentials: true
}));

// Basic middleware setup with proper error handling
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logError('Express error:', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });
  res.status(500).json({ error: 'Internal server error' });
});

// Create HTTP server
const httpServer = createServer(app);

// Serve static files and handle routing
if (!isProd) {
  // Development mode - serve static files directly
  logInfo('Setting up development server');

  // Serve static files with proper MIME types
  const staticOptions = {
    setHeaders: (res: Response, filePath: string) => {
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      }
      // Log served files in development
      logInfo('Serving static file:', { path: filePath });
    }
  };

  // Serve from client directory
  app.use(express.static(path.join(process.cwd(), 'client'), staticOptions));

  // API routes
  app.use('/api', (req, res, next) => {
    logInfo('API request:', { 
      method: req.method,
      path: req.path,
      query: req.query
    });
    next();
  });

  // Client-side routing fallback
  app.use('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(process.cwd(), 'client', 'index.html'));
  });

  logTiming('Development server setup');
} else {
  // Production mode - serve from dist
  logInfo('Setting up production server');
  app.use(express.static(path.join(process.cwd(), 'dist', 'public')));
  app.use('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(process.cwd(), 'dist', 'public', 'index.html'));
  });
  logTiming('Production server setup');
}

// Initialize database
try {
  const { db } = await import('@db');
  await db.execute(sql`SELECT 1`);
  logInfo('Database connection successful');
  logTiming('Database initialization');
} catch (error) {
  logError('Database initialization failed:', {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
}

// Setup authentication
try {
  setupAuth(app);
  logTiming('Authentication setup');
} catch (error) {
  logError('Auth setup failed:', {
    error: error instanceof Error ? error.message : String(error)
  });
}

// Register routes
try {
  registerRoutes(app);
  logTiming('Routes registration');
} catch (error) {
  logError('Route registration failed:', {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
}

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  logTiming('Server startup complete');
  logInfo('Server started successfully', {
    port: PORT,
    environment: process.env.NODE_ENV,
    startup_duration_ms: (performance.now() - startTime).toFixed(2)
  });

  // Initialize background services
  Promise.allSettled([
    initializeMonitoring(),
    initializeAnalytics()
  ]).then(() => {
    logInfo('Background services initialized');
  }).catch(error => {
    logError('Background services initialization error:', {
      error: error instanceof Error ? error.message : String(error)
    });
  });
});

// Error handling
process.on('uncaughtException', (error) => {
  logError('Uncaught Exception:', {
    error: error instanceof Error ? error.message : String(error),
    stack: error.stack
  });
  process.exit(1);
});

process.on('SIGTERM', () => {
  logInfo('Received SIGTERM signal, initiating graceful shutdown');
  httpServer.close(() => {
    logInfo('HTTP server closed');
    process.exit(0);
  });
});