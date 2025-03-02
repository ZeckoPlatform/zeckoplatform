import type { Express, Request, Response, NextFunction } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { log } from "./vite";
import jwt from 'jsonwebtoken';

const scryptAsync = promisify(scrypt);
const JWT_SECRET = process.env.JWT_SECRET || randomBytes(32).toString('hex');

// Add type declarations for Express Request
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  try {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    log('Password comparison error:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

export function generateToken(user: any) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      userType: user.userType
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      message: "Authentication required"
    });
  }

  jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
    if (err) {
      log('Token verification failed:', err.message);
      return res.status(401).json({
        message: "Invalid or expired token"
      });
    }

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, decoded.id))
        .limit(1);

      if (!user) {
        log('User not found for token:', decoded.id);
        return res.status(401).json({
          message: "User not found"
        });
      }

      req.user = user;
      next();
    } catch (error) {
      log('Database error in auth middleware:', error instanceof Error ? error.message : String(error));
      return res.status(500).json({
        message: "Internal server error"
      });
    }
  });
}

export function setupAuth(app: Express) {
  app.post("/api/login", async (req, res) => {
    try {
      log('Login attempt received for:', req.body.email);
      const { email, password } = req.body;

      if (!email || !password) {
        log('Login failed: Missing email or password');
        return res.status(400).json({
          message: "Email and password are required"
        });
      }

      // Find user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        log('Login failed: No user found with email:', email);
        return res.status(401).json({
          message: "Invalid credentials"
        });
      }

      if (!user.password) {
        log('Login failed: User has no password set');
        return res.status(500).json({
          message: "User account configuration error"
        });
      }

      const isValidPassword = await comparePasswords(password, user.password);
      log('Password validation result:', isValidPassword);

      if (!isValidPassword) {
        return res.status(401).json({
          message: "Invalid credentials"
        });
      }

      const token = generateToken(user);
      log('Login successful for user:', user.id);

      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          userType: user.userType,
          subscriptionActive: user.subscriptionActive,
          subscriptionTier: user.subscriptionTier
        }
      });
    } catch (error) {
      log('Login error:', error instanceof Error ? error.message : String(error));
      return res.status(500).json({
        message: "An error occurred during login"
      });
    }
  });

  app.post("/api/logout", (req, res) => {
    res.json({ message: "Logged out successfully" });
  });

  app.get("/api/user", authenticateToken, (req, res) => {
    res.json(req.user);
  });
}