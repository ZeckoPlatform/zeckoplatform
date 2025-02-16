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

// Add process termination handlers
process.on('SIGTERM', () => {
  log('SIGTERM signal received: closing HTTP server');
  if (global.server && global.server.listening) {
    global.server.close(() => {
      log('HTTP server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  log('SIGINT signal received: closing HTTP server');
  if (global.server && global.server.listening) {
    global.server.close(() => {
      log('HTTP server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

const startServer = async (server: Server): Promise<boolean> => {
  return new Promise((resolve) => {
    let isResolved = false;
    const PORT = 5000; // Force port 5000 for Replit

    const cleanup = () => {
      if (!isResolved) {
        server.removeAllListeners();
        if (server.listening) {
          server.close(() => {
            log('Server closed during cleanup');
          });
        }
      }
    };

    const onError = (error: NodeJS.ErrnoException) => {
      if (isResolved) return;

      cleanup();
      log(`Server error on port ${PORT}: ${error.message}`);
      resolve(false);
      isResolved = true;
    };

    const onListening = () => {
      if (isResolved) return;

      log(`Server successfully started on port ${PORT}`);
      resolve(true);
      isResolved = true;
    };

    server.once('error', onError);
    server.once('listening', onListening);

    // Set a timeout for the port binding attempt
    const timeout = setTimeout(() => {
      if (!isResolved) {
        log(`Timeout while attempting to bind to port ${PORT}`);
        cleanup();
        resolve(false);
        isResolved = true;
      }
    }, 5000); // 5 second timeout

    try {
      log(`Attempting to bind to port ${PORT}...`);
      server.listen(PORT, '0.0.0.0');
      // Store server reference globally for cleanup
      global.server = server;
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
    log(`Using fixed port: 5000 for Replit compatibility`);
    log('=== End Environment Information ===');

    log('Initializing server...');
    const server = createServer();

    log('Starting server...');
    const serverStarted = await startServer(server);

    if (!serverStarted) {
      throw new Error('Could not start server on port 5000');
    }

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
    } catch (error) {
      log(`Warning: Failed to setup Vite/static serving: ${error}`);
      // Continue running even if Vite setup fails
    }

  } catch (error) {
    log(`Fatal server startup error: ${error}`);
    process.exit(1);
  }
})();

// Add type declaration for global server
declare global {
  var server: Server | undefined;
}