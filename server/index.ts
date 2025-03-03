import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";
import { Server } from "http";
import { logInfo, logError } from "./services/logging";

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// Startup logging
logInfo('=== Server Initialization Started ===', {
  environment: process.env.NODE_ENV,
  processId: process.pid,
  nodeVersion: process.version
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

// Register API routes
logInfo('Registering routes...');
const httpServer = registerRoutes(app);
logInfo('Routes registered successfully');

// Setup frontend serving
if (isProd) {
  logInfo('Setting up production static file serving');
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
logInfo(`Starting server on port ${PORT} (0.0.0.0)...`);

httpServer.listen(PORT, '0.0.0.0', () => {
  const addr = httpServer.address();
  const actualPort = typeof addr === 'string' ? addr : addr?.port;
  logInfo(`Server successfully started and listening on port ${actualPort}`, {
    address: addr,
    url: `http://localhost:${actualPort}`
  });
});

// Handle server errors
httpServer.on('error', (error: Error) => {
  logError('Server error:', {
    error: error instanceof Error ? error.message : String(error),
    stack: error.stack
  });
});