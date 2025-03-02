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