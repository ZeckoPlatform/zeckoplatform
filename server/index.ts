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

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// Start timing server initialization
const startTime = performance.now();
let lastCheckpoint = startTime;

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

// Startup logging
logInfo('=== Server Initialization Started ===', {
  environment: process.env.NODE_ENV,
  processId: process.pid
});

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
logTiming('Basic middleware setup');

// Enhanced CORS setup for development
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (origin.includes('localhost') || 
        origin.includes('.replit.dev') || 
        origin.includes('replit.app')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));
logTiming('CORS setup');

// Initialize authentication first
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
    totalStartupTime: `${(performance.now() - startTime).toFixed(2)}ms`
  });

  // Defer heavy initialization tasks
  setTimeout(() => {
    const initStart = performance.now();

    // Initialize monitoring
    try {
      initializeMonitoring();
      logTiming('Monitoring initialization');
    } catch (error) {
      logError('Failed to initialize monitoring:', {
        error: error instanceof Error ? error.message : String(error),
        duration: performance.now() - initStart
      });
    }

    // Initialize analytics
    initializeAnalytics().then(() => {
      logTiming('Analytics initialization');
    }).catch(error => {
      logError('Failed to initialize analytics:', {
        error: error instanceof Error ? error.message : String(error),
        duration: performance.now() - initStart
      });
    });
  }, 5000); // 5 second delay
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