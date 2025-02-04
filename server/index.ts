import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "@db";

const app = express();
app.set('trust proxy', 1);

// Initialize session store with more detailed configuration
const PostgresSessionStore = connectPg(session);
const store = new PostgresSessionStore({
  pool,
  tableName: 'session',
  createTableIfMissing: true,
  pruneSessionInterval: 60
});

store.on('error', function(error) {
  log(`Session store error: ${error}`);
});

// Session middleware configuration updated for Replit environment
app.use(session({
  store,
  secret: process.env.REPL_ID!,
  name: 'connect.sid',
  resave: true,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    secure: true, // Enable secure cookies for HTTPS
    httpOnly: true,
    sameSite: 'none', // Required for cross-site cookies
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  }
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Updated CORS configuration for secure cookie handling
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin) {
    return next();
  }

  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Cookie, Set-Cookie');
  res.header('Access-Control-Expose-Headers', 'Set-Cookie');
  res.header('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    log(`Request: ${req.method} ${req.path} - Session ID: ${req.sessionID}`);
    log(`Headers: ${JSON.stringify(req.headers)}`);
    log(`Session: ${JSON.stringify(req.session)}`);
    log(`Cookie: ${JSON.stringify(req.headers.cookie)}`);
  }
  next();
});

(async () => {
  const server = registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    log(`Error occurred: ${status} - ${message}`);
    res.status(status).json({ message });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();