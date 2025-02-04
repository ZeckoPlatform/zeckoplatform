import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "@db";

const app = express();
app.set('trust proxy', 1);

// CORS configuration for secure cookie handling
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin) {
    return next();
  }

  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Cookie, Set-Cookie');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Expose-Headers', 'Set-Cookie');
  res.header('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Session store setup with enhanced error handling
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

const isProd = app.get('env') === 'production';

// Session configuration with environment-aware cookie settings
const sessionConfig = {
  store,
  secret: process.env.REPL_ID!,
  name: 'sid',
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    secure: isProd,
    httpOnly: true,
    sameSite: isProd ? 'none' as const : 'lax' as const,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/',
  }
};

if (isProd) {
  app.set('trust proxy', 1);
  sessionConfig.cookie.secure = true;
}

app.use(session(sessionConfig));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enhanced request logging middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    log(`Request: ${req.method} ${req.path}`);
    log(`Session ID: ${req.sessionID}`);
    log(`Headers: ${JSON.stringify(req.headers)}`);
    log(`Session Data: ${JSON.stringify(req.session)}`);
    log(`Cookie Header: ${req.headers.cookie}`);
    log(`Is Authenticated: ${req.isAuthenticated?.()}`);
    log(`User: ${JSON.stringify(req.user)}`);

    // Ensure session is touched on each request
    if (req.session) {
      req.session.touch();
    }
  }
  next();
});

// Error handling
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  log(`Server error: ${err.message}`);
  res.status(500).json({ message: err.message });
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