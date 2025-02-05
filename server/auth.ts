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

const scryptAsync = promisify(scrypt);

declare module "express-session" {
  interface SessionData {
    passport: {
      user?: number;
    };
  }
}

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
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        log(`Attempting authentication for username: ${username}`);
        const [user] = await getUserByUsername(username);

        if (!user || !(await comparePasswords(password, user.password))) {
          log(`Authentication failed for username: ${username}`);
          return done(null, false, { message: "Invalid credentials" });
        }

        log(`Authentication successful for user: ${user.id}`);
        return done(null, user);
      } catch (error) {
        log(`Authentication error: ${error}`);
        return done(error);
      }
    })
  );

  passport.serializeUser((user: SelectUser, done) => {
    log(`Serializing user: ${user.id}`);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      log(`Deserializing user: ${id}`);
      const [user] = await db.select().from(users).where(eq(users.id, id));

      if (!user) {
        log(`Deserialization failed - user not found: ${id}`);
        return done(null, false);
      }

      log(`User deserialized successfully: ${user.id}`);
      done(null, user);
    } catch (error) {
      log(`Deserialization error: ${error}`);
      done(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    log(`Login attempt for username: ${req.body.username}`);
    log(`Session before login: ${JSON.stringify(req.session)}`);

    passport.authenticate("local", (err: any, user: SelectUser | false) => {
      if (err) {
        log(`Login error: ${err}`);
        return next(err);
      }

      if (!user) {
        log(`Login failed for username: ${req.body.username}`);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.logIn(user, (err) => {
        if (err) {
          log(`Login error during req.logIn: ${err}`);
          return next(err);
        }

        // Force session save
        req.session.save((err) => {
          if (err) {
            log(`Session save error: ${err}`);
            return next(err);
          }

          log(`Login successful for user: ${user.id}`);
          log(`Session after login: ${JSON.stringify(req.session)}`);

          // Send session cookie in response
          res.cookie('session', req.sessionID, {
            httpOnly: true,
            secure: false,
            sameSite: 'none'
          });

          res.json({ user });
        });
      });
    })(req, res, next);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).toString() });
      }

      const [existingUser] = await getUserByUsername(result.data.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const [user] = await db.insert(users)
        .values({
          username: result.data.username,
          password: await hashPassword(result.data.password),
          userType: result.data.userType,
        })
        .returning();

      req.logIn(user, (err) => {
        if (err) return next(err);

        // Force session save after registration
        req.session.save((err) => {
          if (err) return next(err);

          log(`Registration successful for user: ${user.id}`);
          res.status(201).json({ user });
        });
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/logout", (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(200);
    }

    const userId = req.user?.id;
    log(`Logout attempt for user: ${userId}`);

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

        res.clearCookie('session');
        log(`Logout successful for user: ${userId}`);
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/auth/verify", (req, res) => {
    log(`Auth verification request - Session ID: ${req.sessionID}`);
    log(`Session data: ${JSON.stringify(req.session)}`);

    if (req.isAuthenticated() && req.user) {
      log(`Auth verified for user: ${req.user.id}`);
      res.json({ authenticated: true, user: req.user });
    } else {
      log(`Auth verification failed - Session: ${req.sessionID}`);
      res.status(401).json({ authenticated: false });
    }
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });
}