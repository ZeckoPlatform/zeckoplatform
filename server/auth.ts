import type { Express, Request, Response, NextFunction } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type SelectUser } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { fromZodError } from "zod-validation-error";
import { log } from "./vite";
import jwt from 'jsonwebtoken';
import { z } from "zod";

const scryptAsync = promisify(scrypt);
const JWT_SECRET = process.env.REPL_ID!;

// Middleware to authenticate requests using JWT token
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  res.setHeader('Content-Type', 'application/json');

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    log('No authentication token found');
    return res.status(401).json({ 
      success: false,
      message: "Authentication required" 
    });
  }

  jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
    if (err) {
      log('Invalid token:', err.message);
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
        log('User not found for token');
        return res.status(401).json({ 
          success: false,
          message: "User not found" 
        });
      }

      (req as any).user = user;
      log('User authenticated via JWT token');
      next();
    } catch (error) {
      log('Database error in auth middleware:', error);
      return res.status(500).json({ 
        success: false,
        message: "Internal server error" 
      });
    }
  });
}

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

export function generateToken(user: SelectUser) {
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

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required")
});

export function setupAuth(app: Express) {
  // Login endpoint
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      log(`Login attempt for email: ${email}`);

      // Validate request body
      const validatedData = loginSchema.parse(req.body);
      log('Request validation passed');

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required"
        });
      }

      // Find user by email
      log('Querying database for user...');
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      log(`User lookup result: ${user ? 'Found' : 'Not found'}`);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials"
        });
      }

      // Verify password
      const isValidPassword = await comparePasswords(password, user.password);
      log(`Password validation result: ${isValidPassword ? 'Valid' : 'Invalid'}`);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials"
        });
      }

      // Generate JWT token
      const token = generateToken(user);
      log(`Login successful for user: ${user.id}`);

      // Send response
      res.json({
        success: true,
        user,
        token
      });
    } catch (error) {
      log('Login error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors
        });
      }

      res.status(500).json({
        success: false,
        message: "Internal server error during login",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Register endpoint
  app.post("/api/register", async (req, res) => {
    try {
      const result = insertUserSchema.safeParse(req.body);

      if (!result.success) {
        log(`Registration validation failed: ${fromZodError(result.error).toString()}`);
        return res.status(400).json({
          success: false,
          message: fromZodError(result.error).toString()
        });
      }

      // Check for existing email
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, result.data.email))
        .limit(1);

      if (existingUser) {
        log(`Registration failed: Email ${result.data.email} already exists`);
        return res.status(400).json({
          success: false,
          message: "Email already registered"
        });
      }

      // Create new user
      const [user] = await db
        .insert(users)
        .values({
          ...result.data,
          password: await hashPassword(result.data.password)
        })
        .returning();

      const token = generateToken(user);
      log(`User created successfully: ID ${user.id}`);

      res.status(201).json({
        success: true,
        user,
        token
      });
    } catch (error) {
      log(`Registration error: ${error}`);
      res.status(500).json({
        success: false,
        message: "Registration failed",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/logout", (req, res) => {
    try {
      res.json({
        success: true,
        message: "Logged out successfully"
      });
    } catch (error) {
      log('Logout error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to logout"
      });
    }
  });

  app.get("/api/user", authenticateToken, (req, res) => {
    res.json((req as any).user);
  });
}