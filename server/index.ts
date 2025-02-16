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

    server.once('error', (err: NodeJS.ErrnoException) => {
      cleanup();
      if (err.code === 'EADDRINUSE') {
        log(`Port ${port} is in use`);
        resolve(false);
      } else {
        log(`Server error on port ${port}: ${err.message}`);
        resolve(false);
      }
    });

    server.listen(port, '0.0.0.0', () => {
      log(`Server running on port ${port}`);
      resolve(true);
    });
  });
};

(async () => {
  try {
    log('Initializing server...');

    // Create a single server instance
    const server = createServer();

    // Temporarily use static serving for both dev and prod
    log('Setting up static file serving...');
    serveStatic(app);

    // Try ports in sequence
    const ports = [5000, 3000, 3001, 8080, 8081, 4000, 4001];
    let serverStarted = false;

    for (const port of ports) {
      log(`Attempting to start server on port ${port}...`);
      const success = await startServer(server, port);
      if (success) {
        serverStarted = true;
        break;
      }
    }

    if (!serverStarted) {
      throw new Error('Could not start server on any available ports');
    }
  } catch (error) {
    log(`Server startup error: ${error}`);
    process.exit(1);
  }
})();