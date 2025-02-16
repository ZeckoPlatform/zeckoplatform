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
  return server;
};

const startServer = async (server: Server, port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    let isResolved = false;

    const cleanup = () => {
      if (!isResolved) {
        server.removeAllListeners();
        if (server.listening) {
          server.close();
        }
      }
    };

    const onError = (error: NodeJS.ErrnoException) => {
      if (isResolved) return;

      cleanup();
      if (error.code === 'EADDRINUSE') {
        log(`Port ${port} is in use, will try next port`);
        resolve(false);
      } else {
        log(`Server error on port ${port}: ${error.message}`);
        resolve(false);
      }
      isResolved = true;
    };

    const onListening = () => {
      if (isResolved) return;

      log(`Server successfully started on port ${port}`);
      resolve(true);
      isResolved = true;
    };

    server.once('error', onError);
    server.once('listening', onListening);

    // Set a timeout for the port binding attempt
    const timeout = setTimeout(() => {
      if (!isResolved) {
        log(`Timeout while attempting to bind to port ${port}`);
        cleanup();
        resolve(false);
        isResolved = true;
      }
    }, 5000); // 5 second timeout

    try {
      log(`Attempting to bind to port ${port}...`);
      server.listen(port, '0.0.0.0');
    } catch (error) {
      if (!isResolved) {
        cleanup();
        log(`Failed to start server: ${error}`);
        resolve(false);
        isResolved = true;
      }
    } finally {
      clearTimeout(timeout);
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
    log('=== End Environment Information ===');

    log('Initializing server...');
    const server = createServer();

    // Define ports to try in order of preference
    const preferredPort = process.env.PORT || process.env.REPLIT_PORT || 3000;
    const ports = [parseInt(preferredPort.toString()), 3000, 8080, 4000];

    log(`Will try ports in order: ${ports.join(', ')}`);
    let serverStarted = false;

    // Try each port until one works
    for (const port of ports) {
      log(`Attempting to start server on port ${port}...`);
      serverStarted = await startServer(server, port);
      if (serverStarted) {
        // Setup Vite or static serving after successful port binding
        try {
          if (app.get("env") === "development") {
            log('Setting up Vite development server...');
            await setupVite(app, server);
            log('Vite setup completed successfully');
          } else {
            log('Production mode: Setting up static file serving...');
            serveStatic(app);
          }
          break;
        } catch (error) {
          log(`Warning: Failed to setup Vite/static serving: ${error}`);
          // Continue running even if Vite setup fails
        }
      }
    }

    if (!serverStarted) {
      throw new Error('Could not start server on any available port');
    }

  } catch (error) {
    log(`Fatal server startup error: ${error}`);
    process.exit(1);
  }
})();