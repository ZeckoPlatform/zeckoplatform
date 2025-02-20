import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { Server } from "http";

const app = express();
const isProd = app.get('env') === 'production';

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Debug middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    log('=== Request Debug Info ===');
    log(`Path: ${req.method} ${req.path}`);
    log(`Authorization: ${req.headers.authorization ? 'Present' : 'Missing'}`);
    log(`Query params: ${JSON.stringify(req.query)}`);
    log(`Body length: ${req.body ? JSON.stringify(req.body).length : 0}`);
    log('=== End Debug Info ===');
  }
  next();
});

// CORS middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin) {
    return next();
  }

  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Error handling
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  log(`Server error: ${err.message}`);
  log(`Stack trace: ${err.stack}`);
  res.status(500).json({ message: "Internal server error" });
});

const createServer = (): Server => {
  log('Creating HTTP server...');
  const server = registerRoutes(app);
  log('Routes registered successfully');
  return server;
};

const startServer = async (server: Server, port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    let isResolved = false;

    const cleanup = () => {
      if (!isResolved) {
        log(`Cleaning up server on port ${port}`);
        server.removeAllListeners();
        if (server.listening) {
          server.close();
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

      const addr = server.address();
      const actualPort = typeof addr === 'string' ? addr : addr?.port;
      log(`Server successfully started and listening on port ${actualPort}`);
      resolve(true);
      isResolved = true;
    };

    server.once('error', onError);
    server.once('listening', onListening);

    try {
      // Hardcode port 5000 for testing
      const PORT = 5000;
      log(`Attempting to bind to port ${PORT} on address 0.0.0.0...`);
      server.listen(PORT, '0.0.0.0');
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

(async () => {
  try {
    // Log environment information
    log('=== Environment Information ===');
    log(`NODE_ENV: ${process.env.NODE_ENV}`);
    log(`PORT: ${process.env.PORT}`);
    log(`REPLIT_PORT: ${process.env.REPLIT_PORT}`);
    log(`Process ID: ${process.pid}`);
    log(`Platform: ${process.platform}`);
    log(`Node Version: ${process.version}`);
    log('=== End Environment Information ===');

    log('Initializing server...');
    const server = createServer();

    // Use hardcoded port 5000 for testing
    const PORT = 5000;
    log(`Testing server startup with fixed port ${PORT}`);

    const serverStarted = await startServer(server, PORT);
    if (serverStarted) {
      log('Server started successfully, setting up services...');
      try {
        if (app.get("env") === "development") {
          log('Setting up Vite development server...');
          await setupVite(app, server);
          log('Vite setup completed successfully');
        } else {
          log('Production mode: Setting up static file serving...');
          serveStatic(app);
          log('Static file serving setup completed');
        }
        log('Server setup completed successfully');
      } catch (error) {
        log(`Error during Vite/static setup: ${error}`);
        throw error;
      }
    } else {
      throw new Error(`Could not start server on port ${PORT}`);
    }
  } catch (error) {
    log(`Fatal server startup error: ${error}`);
    process.exit(1);
  }
})();