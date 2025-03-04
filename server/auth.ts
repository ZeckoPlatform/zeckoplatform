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
  try {
    // Create a UTF-8 encoded Buffer from the password string
    const pwBuffer = Buffer.from(password, 'utf8');

    // Create hash using SHA-256
    const hash = createHash('sha256');
    hash.update(pwBuffer);

    // Get hex digest
    const hashedPassword = hash.digest('hex');

    // Debug log the hashing process
    log('Password hashing:', {
      input: password,
      inputBuffer: pwBuffer.toString('hex'),
      hashedOutput: hashedPassword,
      expectedHash: "123f7788d67a5b86df83b8b03d0c8ce0bba9c7c2f0e21df56aef0bc2c48d48d3",
      matches: hashedPassword === "123f7788d67a5b86df83b8b03d0c8ce0bba9c7c2f0e21df56aef0bc2c48d48d3"
    });

    return hashedPassword;
  } catch (error) {
    log('Password hashing error:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

export function setupAuth(app: Express) {
  app.use('/api/auth', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      log('Login request received:', {
        email,
        passwordLength: password?.length || 0
      });

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required"
        });
      }

      // Find user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      if (!user) {
        log('No user found:', email);
        return res.status(401).json({
          success: false,
          message: "Invalid credentials"
        });
      }

      log('User found:', {
        id: user.id,
        email: user.email,
        storedHash: user.password
      });

      // Hash and verify password
      const hashedPassword = hashPassword(password);
      const passwordMatch = hashedPassword === user.password;

      log('Password verification:', {
        providedPassword: password,
        providedHash: hashedPassword,
        storedHash: user.password,
        matches: passwordMatch
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
        .where(eq(users.email, validatedData.email));

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email already registered"
        });
      }

      // Hash password and create user
      const hashedPassword = hashPassword(validatedData.password);
      log('Creating new user:', {
        email: validatedData.email,
        hashedPassword
      });

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
        .where(eq(users.id, decoded.id));

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