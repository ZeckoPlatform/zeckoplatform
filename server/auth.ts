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

export async function hashPassword(password: string) {
  try {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 32)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  } catch (error) {
    log('Error hashing password:', error instanceof Error ? error.message : String(error));
    throw new Error('Failed to hash password');
  }
}

export async function comparePasswords(supplied: string, stored: string) {
  try {
    if (!stored || !stored.includes('.')) {
      log('Invalid stored password format');
      return false;
    }

    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 32)) as Buffer;

    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    log('Error comparing passwords:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required")
});

export function generateToken(user: SelectUser) {
  return jwt.sign(
    { 
      id: user.id,
      email: user.email,
      userType: user.userType,
      superAdmin: user.userType === 'admin' || user.superAdmin 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function setupAuth(app: Express) {
  app.post("/api/login", async (req, res) => {
    try {
      log('Login attempt received:', { 
        email: req.body.email,
        hasPassword: !!req.body.password,
        passwordLength: req.body.password?.length 
      });

      const validatedData = loginSchema.parse(req.body);
      log('Validation passed for:', validatedData.email);

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, validatedData.email))
        .limit(1);

      if (!user) {
        log('Login failed: User not found');
        return res.status(401).json({
          success: false,
          message: "Invalid credentials"
        });
      }

      const isValidPassword = await comparePasswords(validatedData.password, user.password);
      log('Password validation result:', { 
        isValid: isValidPassword,
        storedPasswordFormat: user.password.includes('.'),
        storedPasswordLength: user.password.length
      });

      if (!isValidPassword) {
        log('Login failed: Invalid password');
        return res.status(401).json({
          success: false,
          message: "Invalid credentials"
        });
      }

      const token = generateToken(user);
      log('Login successful for user:', user.id);

      res.json({
        success: true,
        user: {
          ...user,
          superAdmin: user.userType === 'admin' || user.superAdmin
        },
        token
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        log('Login validation error:', error.errors);
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors
        });
      }
      log('Login error:', error instanceof Error ? error.message : String(error));
      res.status(500).json({
        success: false,
        message: "Internal server error during login"
      });
    }
  });

  app.post("/api/logout", (req, res) => {
    res.json({
      success: true,
      message: "Logged out successfully"
    });
  });

  app.get("/api/user", authenticateToken, (req, res) => {
    res.json((req as any).user);
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
        ...user,
        superAdmin: user.userType === 'admin' || user.superAdmin
      };
      next();
    } catch (error) {
      log('Database error in auth middleware:', error instanceof Error ? error.message : String(error));
      return res.status(500).json({ 
        success: false,
        message: "Internal server error" 
      });
    }
  });
}