import type { Express, Request, Response, NextFunction } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { log } from "./vite";
import jwt from 'jsonwebtoken';

const scryptAsync = promisify(scrypt);
// Use a secure secret or fallback for JWT
const JWT_SECRET = process.env.JWT_SECRET || randomBytes(32).toString('hex');

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
    log(`Error comparing passwords: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

export function generateToken(user: any) {
  try {
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        userType: user.userType
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    log(`Token generated successfully for user ${user.id}`);
    return token;
  } catch (error) {
    log(`Error generating token: ${error}`);
    throw new Error('Failed to generate authentication token');
  }
}

export function setupAuth(app: Express) {
  // Debug middleware to log all requests
  app.use((req, res, next) => {
    log(`${req.method} ${req.path}`);
    next();
  });

  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      log(`Login attempt received for email: ${email}`);

      if (!email || !password) {
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
        log(`Login failed: No user found with email ${email}`);
        return res.status(401).json({
          message: "Invalid credentials"
        });
      }

      // Log password details for debugging
      log(`Found user ${user.id}, checking password...`);
      if (!user.password) {
        log(`Error: User ${user.id} has no password stored`);
        return res.status(500).json({
          message: "User account configuration error"
        });
      }

      // Verify password
      try {
        const isValidPassword = await comparePasswords(password, user.password);
        log(`Password validation result for user ${email}: ${isValidPassword}`);

        if (!isValidPassword) {
          log(`Login failed: Invalid password for user ${email}`);
          return res.status(401).json({
            message: "Invalid credentials"
          });
        }
      } catch (error) {
        log(`Password validation error: ${error}`);
        return res.status(500).json({
          message: "An error occurred during password validation"
        });
      }

      // Generate token on successful login
      try {
        const token = generateToken(user);
        log(`Login successful for user: ${user.id}, token generated`);

        // Return user data and token
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
        log(`Token generation error: ${error}`);
        return res.status(500).json({
          message: "An error occurred during token generation"
        });
      }
    } catch (error) {
      log(`Login error: ${error instanceof Error ? error.message : String(error)}`);
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
      log(`Token verification failed:`, err);
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
        return res.status(401).json({
          message: "User not found"
        });
      }

      req.user = user;
      next();
    } catch (error) {
      log('Database error in auth middleware:', error);
      return res.status(500).json({
        message: "Internal server error"
      });
    }
  });
}