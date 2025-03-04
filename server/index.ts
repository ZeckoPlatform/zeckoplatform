import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { Server } from "http";
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

// Initialize monitoring first before registering routes
try {
  initializeMonitoring();
} catch (error) {
  logError('Failed to initialize monitoring:', {
    error: error instanceof Error ? error.message : String(error)
  });
  // Continue server startup even if monitoring fails
}

// Register API routes
logInfo('Registering routes...');
const httpServer = registerRoutes(app);
logInfo('Routes registered successfully');

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

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logError('Error handler:', {
    error: err instanceof Error ? err.message : String(err),
    stack: err.stack
  });

  if (res.headersSent) {
    return next(err);
  }

  // Store error for metrics middleware
  res.locals.error = err;

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
const startServer = async (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    let isResolved = false;

    const cleanup = () => {
      if (!isResolved) {
        logInfo(`Cleaning up server on port ${port}`);
        httpServer.removeAllListeners();
        if (httpServer.listening) {
          httpServer.close();
        }
      }
    };

    const onError = (error: NodeJS.ErrnoException) => {
      if (isResolved) return;

      logError(`Server error on port ${port}:`, {
        name: error.name,
        message: error.message,
        code: error.code
      });
      cleanup();
      resolve(false);
      isResolved = true;
    };

    const onListening = () => {
      if (isResolved) return;

      const addr = httpServer.address();
      const actualPort = typeof addr === 'string' ? addr : addr?.port;
      logInfo(`Server successfully started and listening on port ${actualPort}`);
      resolve(true);
      isResolved = true;
    };

    httpServer.once('error', onError);
    httpServer.once('listening', onListening);

    try {
      logInfo(`Attempting to bind to port ${port} on address 0.0.0.0...`);
      httpServer.listen(port, '0.0.0.0');
    } catch (error) {
      if (!isResolved) {
        logError(`Failed to start server:`, {
          error: error instanceof Error ? error.message : String(error)
        });
        cleanup();
        resolve(false);
        isResolved = true;
      }
    }
  });
};

// Schedule periodic performance checks
const PERFORMANCE_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
setInterval(() => {
  checkPerformanceMetrics().catch(error => {
    logError('Failed to run performance check:', {
      error: error instanceof Error ? error.message : String(error)
    });
  });
}, PERFORMANCE_CHECK_INTERVAL);

// Main startup function
(async () => {
  try {
    logInfo('=== Environment Information ===', {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      processId: process.pid,
      platform: process.platform,
      nodeVersion: process.version
    });

    const PORT = Number(process.env.PORT) || 5000;
    logInfo(`Starting server on port ${PORT}`);

    const serverStarted = await startServer(PORT);
    if (!serverStarted) {
      throw new Error(`Could not start server on port ${PORT}`);
    }

    logInfo('Server started successfully');
  } catch (error) {
    logError(`Fatal server startup error:`, {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
})();