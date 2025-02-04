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
    log(`Login attempt for username: ${req.body.username}`);
    log(`Session before login: ${JSON.stringify(req.session)}`);
    log(`Cookie Header: ${req.headers.cookie}`);

    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        log(`Login error: ${err}`);
        return next(err);
      }

      if (!user) {
        log(`Login failed: ${info?.message || 'Invalid credentials'}`);
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }

      req.logIn(user, (loginErr) => {
        if (loginErr) {
          log(`Login error during session creation: ${loginErr}`);
          return next(loginErr);
        }

        // Force session save before sending response
        req.session.save((err) => {
          if (err) {
            log(`Session save error: ${err}`);
            return next(err);
          }

          log(`Login successful - User: ${user.id}, Session: ${req.sessionID}`);
          log(`Session after login: ${JSON.stringify(req.session)}`);

          res.json(user);
        });
      });
    })(req, res, next);
  });

  app.post("/api/register", async (req, res, next) => {
    const result = insertUserSchema.safeParse(req.body);
    if (!result.success) {
      const error = fromZodError(result.error);
      log(`Registration validation error: ${error}`);
      return res.status(400).send(error.toString());
    }

    try {
      const [existingUser] = await getUserByUsername(result.data.username);
      if (existingUser) {
        log(`Registration failed: Username ${result.data.username} already exists`);
        return res.status(400).send("Username already exists");
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
          log(`Registration error during session creation: ${err}`);
          return next(err);
        }

        // Force session save before sending response
        req.session.save((err) => {
          if (err) {
            log(`Session save error: ${err}`);
            return next(err);
          }

          log(`Registration successful - User: ${user.id}, Session: ${req.sessionID}`);
          res.status(201).json(user);
        });
      });
    } catch (error) {
      log(`Registration error: ${error}`);
      next(error);
    }
  });

  app.post("/api/logout", (req, res, next) => {
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

        log(`Logout successful - Previous User: ${userId}`);
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", (req, res) => {
    log(`User info request - Authenticated: ${req.isAuthenticated()}, Session: ${req.sessionID}`);
    log(`Session data: ${JSON.stringify(req.session)}`);
    log(`Cookie Header: ${req.headers.cookie}`);
    log(`User: ${JSON.stringify(req.user)}`);

    if (!req.isAuthenticated()) {
      log("User not authenticated");
      return res.sendStatus(401);
    }

    log(`Returning user info for: ${req.user.id}`);
    res.json(req.user);
  });

  app.get("/api/auth/verify", (req, res) => {
    log(`Auth verification - Session ID: ${req.sessionID}`);
    log(`Cookie Header: ${req.headers.cookie}`);
    log(`Session Data: ${JSON.stringify(req.session)}`);
    log(`Is Authenticated: ${req.isAuthenticated()}`);
    log(`User: ${JSON.stringify(req.user)}`);

    if (req.isAuthenticated() && req.user) {
      log(`Auth verified for user: ${req.user.id}`);
      res.status(200).json({ authenticated: true, user: req.user });
    } else {
      log(`Auth verification failed - no valid session`);
      res.status(401).json({ 
        authenticated: false,
        message: "No valid session found"
      });
    }
  });
}