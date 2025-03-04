import type { Express, Request, Response, NextFunction } from "express";
import { createHash } from "crypto";
import { users } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import jwt from 'jsonwebtoken';
import express from 'express';
import { log } from "./vite";

const JWT_SECRET = process.env.REPL_ID!;

// Schema validation
const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  userType: z.string().optional()
});

export function hashPassword(password: string): string {
  const hashed = createHash('sha256').update(password).digest('hex');
  log('Password hashing:', { 
    originalLength: password.length, 
    hashedLength: hashed.length,
    hashedValue: hashed // Only for debugging!
  });
  return hashed;
}

export function setupAuth(app: Express) {
  // API middleware for consistent JSON responses
  app.use('/api/auth', (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      log('Login attempt:', { email, hasPassword: !!password });

      if (!email || !password) {
        log('Missing credentials:', { email: !!email, password: !!password });
        return res.status(400).json({
          success: false,
          message: "Email and password are required"
        });
      }

      // Find user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      log('User lookup result:', { 
        found: !!user, 
        email,
        userDetails: user ? {
          id: user.id,
          email: user.email,
          userType: user.userType,
          storedPasswordHash: user.password // Only for debugging!
        } : null
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials"
        });
      }

      // Verify password
      const providedHash = hashPassword(password);
      const passwordMatch = providedHash === user.password;

      log('Password verification:', { 
        email, 
        matches: passwordMatch,
        providedHash, // Only for debugging!
        storedHash: user.password // Only for debugging!
      });

      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials"
        });
      }

      // Generate token
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          userType: user.userType,
          superAdmin: user.superAdmin
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      log('Login successful:', { email });

      return res.status(200).json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          userType: user.userType,
          superAdmin: user.superAdmin
        }
      });

    } catch (error) {
      log('Login error:', error instanceof Error ? error.message : String(error));
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  });

  app.post("/api/register", async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      log('Registration attempt:', { email: validatedData.email });

      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, validatedData.email))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email already registered"
        });
      }

      const hashedPassword = hashPassword(validatedData.password);
      log('Creating new user:', { 
        email: validatedData.email,
        userType: validatedData.userType || 'free',
        hashedPassword // Only for debugging!
      });

      // Create new user
      const [user] = await db
        .insert(users)
        .values({
          email: validatedData.email,
          password: hashedPassword,
          userType: validatedData.userType || 'free',
          superAdmin: false
        })
        .returning();

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          userType: user.userType,
          superAdmin: user.superAdmin
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      log('Registration successful:', { email: user.email });

      return res.status(201).json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          userType: user.userType,
          superAdmin: user.superAdmin
        }
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Invalid input",
          errors: error.errors
        });
      }

      log('Registration error:', error instanceof Error ? error.message : String(error));
      return res.status(500).json({
        success: false,
        message: "Failed to create account"
      });
    }
  });

  app.post("/api/logout", (req, res) => {
    return res.json({ success: true });
  });

  app.get("/api/user", authenticateToken, (req, res) => {
    return res.json({
      success: true,
      user: req.user
    });
  });
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
    if (err) {
      return res.status(401).json({
        success: false,
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
          success: false,
          message: "User not found"
        });
      }

      (req as any).user = {
        id: user.id,
        email: user.email,
        userType: user.userType,
        superAdmin: user.superAdmin
      };
      next();
    } catch (error) {
      log('Token verification error:', error instanceof Error ? error.message : String(error));
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  });
}