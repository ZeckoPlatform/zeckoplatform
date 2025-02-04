import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "@db";

const app = express();
const isProd = app.get('env') === 'production';

// Session store setup with error handling
const PostgresSessionStore = connectPg(session);
const store = new PostgresSessionStore({
  pool,
  tableName: 'session',
  createTableIfMissing: true,
  pruneSessionInterval: 60,
});

store.on('error', function(error) {
  log(`Session store error: ${error}`);
});

// Session configuration
const sessionConfig = {
  store,
  secret: process.env.REPL_ID!,
  name: 'connect.sid',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  proxy: true,
  cookie: {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
};

if (isProd) {
  app.set('trust proxy', 1);
  sessionConfig.cookie.secure = true;
  sessionConfig.cookie.sameSite = 'none' as const;
}

// Apply session middleware first
app.use(session(sessionConfig));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS configuration
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin) {
    return next();
  }

  // Log CORS-related headers for debugging
  log(`Request origin: ${origin}`);
  log(`Request method: ${req.method}`);

  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Cookie, Set-Cookie');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Expose-Headers', 'Set-Cookie');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Debug middleware for session and cookie tracking
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    log('=== Request Debug Info ===');
    log(`Path: ${req.method} ${req.path}`);
    log(`Session ID: ${req.sessionID}`);
    log(`Cookie Header: ${req.headers.cookie}`);
    log(`Session Data: ${JSON.stringify(req.session)}`);
    log(`Is Authenticated: ${req.isAuthenticated?.()}`);
    log('=== End Debug Info ===');
  }
  next();
});

// Global error handling
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

    const PORT = 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    log(`Server startup error: ${error}`);
    process.exit(1);
  }
})();