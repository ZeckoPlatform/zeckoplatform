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
    const cleanup = () => {
      server.removeAllListeners();
      if (server.listening) {
        server.close();
      }
    };

    const onError = (error: NodeJS.ErrnoException) => {
      cleanup();
      if (error.code === 'EADDRINUSE') {
        log(`Port ${port} is in use`);
        resolve(false);
      } else {
        log(`Server error on port ${port}: ${error.message}`);
        resolve(false);
      }
    };

    const onListening = () => {
      log(`Server successfully started on port ${port}`);
      resolve(true);
    };

    server.once('error', onError);
    server.once('listening', onListening);

    try {
      server.listen(port, '0.0.0.0');
    } catch (error) {
      cleanup();
      log(`Failed to start server: ${error}`);
      resolve(false);
    }
  });
};

(async () => {
  try {
    log('Initializing server...');
    const server = createServer();

    // Setup Vite or static serving before attempting port binding
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
      log(`Fatal error during server setup: ${error}`);
      process.exit(1);
    }

    // Get port from environment or use defaults
    const envPort = process.env.PORT || process.env.REPLIT_PORT;
    const defaultPorts = [3000, 3001, 4000, 4001, 8080, 8081];
    const ports = envPort ? [parseInt(envPort)] : defaultPorts;

    // Try ports sequentially
    let serverStarted = false;
    for (const port of ports) {
      log(`Attempting to start server on port ${port}...`);
      serverStarted = await startServer(server, port);
      if (serverStarted) {
        log(`Server is now running on port ${port}`);
        break;
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