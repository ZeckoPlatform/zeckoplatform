import type { Express, Request, Response, NextFunction } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { log } from "./vite";
import jwt from 'jsonwebtoken';

const scryptAsync = promisify(scrypt);
const JWT_SECRET = process.env.REPL_ID!;

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

export function generateToken(user: any) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      userType: user.userType,
      subscriptionActive: user.subscriptionActive,
      subscriptionTier: user.subscriptionTier
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function setupAuth(app: Express) {
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          message: "Email and password are required"
        });
      }

      log(`Login attempt for email: ${email}`);

      // Find user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        return res.status(401).json({
          message: "Invalid credentials"
        });
      }

      // Verify password
      const isValidPassword = await comparePasswords(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          message: "Invalid credentials"
        });
      }

      // Generate token
      const token = generateToken(user);
      log(`Login successful for user: ${user.id}`);

      // Return user data and token
      res.json({
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
      log(`Login error:`, error);
      res.status(500).json({
        message: "An error occurred during login"
      });
    }
  });

  app.post("/api/register", async (req, res) => {
    try {
      const { email, password, userType, countryCode } = req.body;

      if (!email || !password || !userType || !countryCode) {
        return res.status(400).json({
          message: "All fields are required"
        });
      }

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({
          message: "Email already registered"
        });
      }

      const hashedPassword = await hashPassword(password);

      const [user] = await db
        .insert(users)
        .values({
          email,
          password: hashedPassword,
          userType,
          countryCode,
          active: true,
          subscriptionActive: userType === "free",
          subscriptionTier: userType === "free" ? "none" : userType
        })
        .returning();

      const token = generateToken(user);
      res.status(201).json({ user, token });
    } catch (error) {
      log(`Registration error:`, error);
      res.status(500).json({
        message: "Registration failed"
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