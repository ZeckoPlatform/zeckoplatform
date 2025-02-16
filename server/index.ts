import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

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

(async () => {
  try {
    log('Initializing server...');

    const server = registerRoutes(app);

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Try different ports if the default one is busy
    const ports = [5000, 3000, 3001];
    let serverStarted = false;

    for (const port of ports) {
      try {
        server.listen(port, '0.0.0.0', () => {
          log(`Server running on port ${port}`);
          serverStarted = true;
        });
        break;
      } catch (error: any) {
        if (error.code === 'EADDRINUSE') {
          log(`Port ${port} is busy, trying next port...`);
          continue;
        }
        throw error;
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