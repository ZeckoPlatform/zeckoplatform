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
      log(`Attempting to deserialize user: ${id}`);
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
    log(`Login attempt - Username: ${req.body.username}`);
    log(`Session before login: ${JSON.stringify(req.session)}`);

    passport.authenticate("local", async (err: any, user: SelectUser | false, info: any) => {
      if (err) {
        log(`Login error: ${err}`);
        return next(err);
      }

      if (!user) {
        log(`Login failed: ${info?.message || 'Invalid credentials'}`);
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }

      try {
        await new Promise<void>((resolve, reject) => {
          req.logIn(user, (err) => {
            if (err) {
              log(`Login error during req.logIn: ${err}`);
              reject(err);
            } else {
              log(`Login successful, session ID: ${req.sessionID}`);
              resolve();
            }
          });
        });

        // Save session explicitly
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              log(`Session save error: ${err}`);
              reject(err);
            } else {
              log(`Session saved successfully`);
              resolve();
            }
          });
        });

        log(`Login successful for user: ${user.id}`);
        log(`Session after login: ${JSON.stringify(req.session)}`);
        log(`Session ID: ${req.sessionID}`);

        // Set cookie manually to ensure it's properly set
        res.cookie('connect.sid', req.sessionID, {
          httpOnly: true,
          secure: false, // Set to false for development
          sameSite: 'lax',
          path: '/',
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        res.json({ user });
      } catch (error) {
        log(`Login process error: ${error}`);
        next(error);
      }
    })(req, res, next);
  });

  app.get("/api/user", (req, res) => {
    log(`User request - Session ID: ${req.sessionID}`);
    log(`Session Data: ${JSON.stringify(req.session)}`);
    log(`Is Authenticated: ${req.isAuthenticated()}`);
    log(`User: ${JSON.stringify(req.user)}`);

    if (!req.isAuthenticated() || !req.user) {
      log(`User request failed - not authenticated`);
      return res.status(401).json({ message: "Not authenticated" });
    }

    log(`User request successful - ID: ${req.user.id}`);
    res.json(req.user);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        log(`Registration validation error: ${error}`);
        return res.status(400).json({ message: error.toString() });
      }

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

      await new Promise<void>((resolve, reject) => {
        req.logIn(user, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Save session after registration
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      log(`Registration successful for user: ${user.id}`);
      res.status(201).json({ user });
    } catch (error) {
      log(`Registration error: ${error}`);
      next(error);
    }
  });

  app.get("/api/auth/verify", (req, res) => {
    log(`Auth verification request - Session ID: ${req.sessionID}`);
    log(`Session Data: ${JSON.stringify(req.session)}`);
    log(`Is Authenticated: ${req.isAuthenticated()}`);
    log(`User: ${JSON.stringify(req.user)}`);

    if (req.isAuthenticated() && req.user) {
      log(`Auth verified for user: ${req.user.id}, Session: ${req.sessionID}`);
      res.json({ 
        authenticated: true, 
        user: req.user,
        sessionId: req.sessionID 
      });
    } else {
      log(`Auth verification failed - Session: ${req.sessionID}`);
      res.status(401).json({ authenticated: false });
    }
  });

  app.post("/api/logout", (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(200);
    }

    const userId = req.user?.id;
    log(`Logout attempt - User: ${userId}, Session: ${req.sessionID}`);

    req.logout((err) => {
      if (err) {
        log(`Logout error: ${err}`);
        return next(err);
      }

      req.session.destroy((err) => {
        if (err) {
          log(`Session destruction error: ${err}`);
          return next(err);
        }

        res.clearCookie('connect.sid', {
          path: '/',
          httpOnly: true,
          secure: false,
          sameSite: 'lax'
        });

        log(`Logout successful - User: ${userId}`);
        res.sendStatus(200);
      });
    });
  });
}