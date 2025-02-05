import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "@db";
import passport from "passport";

const app = express();
const isProd = app.get('env') === 'production';

// Body parsing middleware first
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session store setup
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

// Session middleware with detailed logging
const sessionMiddleware = session({
  store,
  secret: process.env.REPL_ID!,
  name: 'sid',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: isProd, // Only use secure in production
    sameSite: 'lax',
    path: '/'
  }
});

// Debug response headers
app.use((req, res, next) => {
  const oldEnd = res.end;
  // @ts-ignore
  res.end = function () {
    if (req.path.startsWith('/api')) {
      log(`Response Headers for ${req.path}: ${JSON.stringify(res.getHeaders())}`);
      log(`Cookies Set: ${res.getHeader('set-cookie')}`);
    }
    // @ts-ignore
    return oldEnd.apply(this, arguments);
  };
  next();
});

app.use(sessionMiddleware);

// Initialize passport after session
app.use(passport.initialize());
app.use(passport.session());

// CORS middleware - Must be after session and passport
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin) {
    return next();
  }

  // Allow the specific origin instead of wildcard
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

// Debug middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    log('=== Request Debug Info ===');
    log(`Path: ${req.method} ${req.path}`);
    log(`Session ID: ${req.sessionID}`);
    log(`Cookie Header: ${req.headers.cookie}`);
    log(`Session Data: ${JSON.stringify(req.session)}`);
    log(`Is Authenticated: ${req.isAuthenticated()}`);
    log(`User: ${JSON.stringify(req.user)}`);
    log('=== End Debug Info ===');
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

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    log(`Server startup error: ${error}`);
    process.exit(1);
  }
})();