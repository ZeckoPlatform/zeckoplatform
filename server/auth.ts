import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type SelectUser } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { fromZodError } from "zod-validation-error";
import { log } from "./vite";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

async function getUserByUsername(username: string) {
  return db.select().from(users).where(eq(users.username, username)).limit(1);
}

export function setupAuth(app: Express) {
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const [user] = await getUserByUsername(username);
        if (!user) {
          log(`Authentication failed: User not found - ${username}`);
          return done(null, false, { message: "Invalid credentials" });
        }

        const isValidPassword = await comparePasswords(password, user.password);
        if (!isValidPassword) {
          log(`Authentication failed: Invalid password for user - ${username}`);
          return done(null, false, { message: "Invalid credentials" });
        }

        log(`Authentication successful for user: ${user.id}`);
        return done(null, user);
      } catch (error) {
        log(`Authentication error: ${error}`);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    log(`Serializing user: ${user.id}`);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        log(`Deserialization failed: User not found - ${id}`);
        return done(null, false);
      }

      log(`Deserialized user successfully: ${user.id}`);
      done(null, user);
    } catch (error) {
      log(`Deserialization error: ${error}`);
      done(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
      if (err) {
        log(`Login error: ${err}`);
        return next(err);
      }

      if (!user) {
        log(`Login failed: ${info?.message || 'Invalid credentials'}`);
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }

      // First regenerate the session to prevent session fixation
      req.session.regenerate((err) => {
        if (err) {
          log(`Session regeneration error: ${err}`);
          return next(err);
        }

        // Then log the user in
        req.logIn(user, (loginErr) => {
          if (loginErr) {
            log(`Login error: ${loginErr}`);
            return next(loginErr);
          }

          // Debug session state
          log('=== Session Debug Info ===');
          log(`User ID: ${user.id}`);
          log(`Session ID: ${req.sessionID}`);
          log(`Session Data: ${JSON.stringify(req.session)}`);
          log(`Cookie Header: ${req.headers.cookie}`);

          // Explicitly set session data
          req.session.userId = user.id;
          req.session.authenticated = true;

          // Force session save
          req.session.save((saveErr) => {
            if (saveErr) {
              log(`Session save error: ${saveErr}`);
              return next(saveErr);
            }

            // Set cookie explicitly
            const isProd = req.app.get('env') === 'production';
            res.cookie('sid', req.sessionID, {
              httpOnly: true,
              secure: isProd,
              sameSite: isProd ? 'none' : 'lax',
              path: '/',
              maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
            });

            log(`Response headers:`, res.getHeaders());
            res.json({ user });
          });
        });
      });
    })(req, res, next);
  });

  app.post("/api/register", async (req, res, next) => {
    const result = insertUserSchema.safeParse(req.body);
    if (!result.success) {
      const error = fromZodError(result.error);
      log(`Registration validation error: ${error}`);
      return res.status(400).json({ message: error.toString() });
    }

    try {
      const [existingUser] = await getUserByUsername(result.data.username);
      if (existingUser) {
        log(`Registration failed: Username ${result.data.username} already exists`);
        return res.status(400).json({ message: "Username already exists" });
      }

      const [user] = await db
        .insert(users)
        .values({
          username: result.data.username,
          password: await hashPassword(result.data.password),
          userType: result.data.userType,
        })
        .returning();

      log(`User registered successfully: ${user.id}`);

      req.logIn(user, (err) => {
        if (err) {
          log(`Login error after registration: ${err}`);
          return next(err);
        }

        req.session.save((err) => {
          if (err) {
            log(`Session save error: ${err}`);
            return next(err);
          }

          log(`Registration and login successful for user: ${user.id}`);
          res.status(201).json({ user });
        });
      });
    } catch (error) {
      log(`Registration error: ${error}`);
      next(error);
    }
  });

  app.post("/api/logout", (req, res) => {
    const userId = req.user?.id;
    log(`Logout attempt - User: ${userId}, Session: ${req.sessionID}`);

    req.logout((err) => {
      if (err) {
        log(`Logout error: ${err}`);
        return res.status(500).json({ message: "Logout failed" });
      }

      req.session.destroy((err) => {
        if (err) {
          log(`Session destruction error: ${err}`);
          return res.status(500).json({ message: "Logout failed" });
        }

        const isProd = app.get('env') === 'production';
        res.clearCookie("sid", {
          path: '/',
          httpOnly: true,
          secure: isProd,
          sameSite: isProd ? 'none' as const : 'lax' as const,
        });

        log(`Logout successful - User: ${userId}`);
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", (req, res) => {
    log(`User request - Session ID: ${req.sessionID}`);
    log(`Is Authenticated: ${req.isAuthenticated()}`);
    log(`User: ${JSON.stringify(req.user)}`);
    log(`Session: ${JSON.stringify(req.session)}`);

    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    res.json(req.user);
  });

  app.get("/api/auth/verify", (req, res) => {
    log(`Auth verification request - Session ID: ${req.sessionID}`);
    log(`Cookie Header: ${req.headers.cookie}`);
    log(`Session Data: ${JSON.stringify(req.session)}`);
    log(`Is Authenticated: ${req.isAuthenticated()}`);
    log(`User: ${JSON.stringify(req.user)}`);

    if (req.isAuthenticated() && req.user) {
      log(`Auth verified for user: ${req.user.id}`);
      res.json({
        authenticated: true,
        user: req.user,
        sessionId: req.sessionID
      });
    } else {
      log(`Auth verification failed - no valid session`);
      res.status(401).json({
        authenticated: false,
        message: "No valid session found"
      });
    }
  });
}