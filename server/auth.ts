import { Express, Request, Response, NextFunction } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type SelectUser } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { fromZodError } from "zod-validation-error";
import { log } from "./vite";
import jwt from 'jsonwebtoken';

const scryptAsync = promisify(scrypt);
const JWT_SECRET = process.env.REPL_ID!;

// Export these functions so they can be used in routes.ts
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

async function getUserByUsername(username: string) {
  return db.select().from(users).where(eq(users.username, username)).limit(1);
}

function generateToken(user: SelectUser) {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username,
      userType: user.userType,
      subscriptionActive: user.subscriptionActive,
      subscriptionTier: user.subscriptionTier
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      log('No token provided');
      return res.status(401).json({ message: 'Authentication required' });
    }

    jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
      if (err) {
        log('Token verification failed:', err);
        return res.status(401).json({ message: 'Invalid or expired token' });
      }

      try {
        // Get fresh user data from database
        const [user] = await db.select().from(users).where(eq(users.id, decoded.id));
        if (!user) {
          log('User not found in database');
          return res.status(401).json({ message: 'User not found' });
        }

        req.user = user;
        next();
      } catch (error) {
        log('Database error during authentication:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }
    });
  } catch (error) {
    log('Authentication middleware error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export function setupAuth(app: Express) {
  app.post("/api/login", async (req, res) => {
    try {
      log(`Login attempt for username: ${req.body.username}`);
      const [user] = await getUserByUsername(req.body.username);

      if (!user || !(await comparePasswords(req.body.password, user.password))) {
        log(`Invalid credentials for username: ${req.body.username}`);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = generateToken(user);
      log(`Login successful for user: ${user.id}`);
      res.json({ user, token });
    } catch (error) {
      log(`Login error: ${error}`);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/register", async (req, res) => {
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
          ...result.data,
          password: await hashPassword(result.data.password),
        })
        .returning();

      const token = generateToken(user);
      log(`Registration successful for user: ${user.id}`);
      res.status(201).json({ user, token });
    } catch (error) {
      log(`Registration error: ${error}`);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/auth/verify", authenticateToken, (req, res) => {
    res.json({ authenticated: true, user: req.user });
  });

  app.get("/api/user", authenticateToken, (req, res) => {
    res.json(req.user);
  });
}