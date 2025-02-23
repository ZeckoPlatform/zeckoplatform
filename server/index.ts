import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { Server } from "http";

const app = express();
const isProd = app.get('env') === 'production';

// Startup logging
log('=== Server Initialization Started ===');
log(`Environment: ${process.env.NODE_ENV}`);
log(`Process ID: ${process.pid}`);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API-specific middleware - only apply to /api routes
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');

  // Debug logging for API requests
  log('=== API Request Debug Info ===');
  log(`Path: ${req.method} ${req.path}`);
  log(`Authorization: ${req.headers.authorization ? 'Present' : 'Missing'}`);
  log(`Query params: ${JSON.stringify(req.query)}`);
  log(`Body length: ${req.body ? JSON.stringify(req.body).length : 0}`);
  log('=== End Debug Info ===');

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

log('Registering routes...');
const httpServer = registerRoutes(app);
log('Routes registered successfully');

// Setup static/Vite serving for frontend routes
if (isProd) {
  log('Setting up production static file serving');
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api')) {
      serveStatic(app);
    }
    next();
  });
} else {
  // Handle development mode with Vite
  log('Setting up Vite development server');
  (async () => {
    try {
      await setupVite(app, httpServer);
      log('Vite setup completed successfully');
    } catch (error) {
      log('Fatal error during Vite setup:', error);
      process.exit(1);
    }
  })();
}

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  log('Error handler:', err);

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

// Start server function
const startServer = async (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    let isResolved = false;

    const cleanup = () => {
      if (!isResolved) {
        log(`Cleaning up server on port ${port}`);
        httpServer.removeAllListeners();
        if (httpServer.listening) {
          httpServer.close();
        }
      }
    };

    const onError = (error: NodeJS.ErrnoException) => {
      if (isResolved) return;

      log(`Server error on port ${port}:`);
      log(`Error name: ${error.name}`);
      log(`Error message: ${error.message}`);
      log(`Error code: ${error.code}`);
      if (error.code === 'EADDRINUSE') {
        log(`Port ${port} is already in use`);
      }
      cleanup();
      resolve(false);
      isResolved = true;
    };

    const onListening = () => {
      if (isResolved) return;

      const addr = httpServer.address();
      const actualPort = typeof addr === 'string' ? addr : addr?.port;
      log(`Server successfully started and listening on port ${actualPort}`);
      resolve(true);
      isResolved = true;
    };

    httpServer.once('error', onError);
    httpServer.once('listening', onListening);

    try {
      log(`Attempting to bind to port ${port} on address 0.0.0.0...`);
      httpServer.listen(port, '0.0.0.0');
    } catch (error) {
      if (!isResolved) {
        log(`Failed to start server: ${error}`);
        cleanup();
        resolve(false);
        isResolved = true;
      }
    }
  });
};

// Main startup function
(async () => {
  try {
    log('=== Environment Information ===');
    log(`NODE_ENV: ${process.env.NODE_ENV}`);
    log(`PORT: ${process.env.PORT}`);
    log(`Process ID: ${process.pid}`);
    log(`Platform: ${process.platform}`);
    log(`Node Version: ${process.version}`);
    log('=== End Environment Information ===');

    const PORT = Number(process.env.PORT) || 5000;
    log(`Starting server on port ${PORT}`);

    const serverStarted = await startServer(PORT);
    if (!serverStarted) {
      throw new Error(`Could not start server on port ${PORT}`);
    }

    log('Server started successfully');
  } catch (error) {
    log(`Fatal server startup error: ${error}`);
    process.exit(1);
  }
})();