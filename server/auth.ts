import type { Express, Request, Response, NextFunction } from "express";
import { createHash } from "crypto";
import { users } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import jwt from 'jsonwebtoken';
import { log } from "./vite";
import * as z from 'zod';

const JWT_SECRET = process.env.REPL_ID!;

export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

// Add registration schema
const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  userType: z.string().optional()
});

export function setupAuth(app: Express) {
  // Ensure JSON responses
  app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      log('Login attempt for:', email);

      // Find user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        log('User not found:', email);
        return res.status(401).json({
          success: false,
          message: "Invalid credentials"
        });
      }

      // Verify password
      const hashedPassword = hashPassword(password);
      log('Password verification:', { email, matches: hashedPassword === user.password });

      if (hashedPassword !== user.password) {
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

      log('Login successful for:', email);
      return res.json({
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

      // Create new user
      const [user] = await db
        .insert(users)
        .values({
          email: validatedData.email,
          password: hashPassword(validatedData.password),
          userType: validatedData.userType || 'free',
          superAdmin: false
        })
        .returning();

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
    return res.json(req.user);
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