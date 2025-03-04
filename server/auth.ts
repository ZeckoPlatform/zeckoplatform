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

// Simple but secure password hashing
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, 32)) as Buffer;
  return `${derivedKey.toString('hex')}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  try {
    const [hash, salt] = stored.split('.');
    const hashBuffer = Buffer.from(hash, 'hex');
    const suppliedBuffer = (await scryptAsync(supplied, salt, 32)) as Buffer;
    return timingSafeEqual(hashBuffer, suppliedBuffer);
  } catch (error) {
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
      superAdmin: user.superAdmin
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function setupAuth(app: Express) {
  app.post("/api/login", async (req, res) => {
    try {
      // Validate request body
      const validatedData = loginSchema.parse(req.body);

      // Find user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, validatedData.email))
        .limit(1);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials"
        });
      }

      // Verify password
      const isValidPassword = await comparePasswords(validatedData.password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials"
        });
      }

      // Generate token and send response
      const token = generateToken(user);

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
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors
        });
      }

      res.status(500).json({
        success: false,
        message: "Internal server error during login"
      });
    }
  });

  app.get("/api/user", authenticateToken, (req, res) => {
    res.json((req as any).user);
  });

  app.post("/api/logout", (req, res) => {
    res.json({
      success: true,
      message: "Logged out successfully"
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
        ...user,
        superAdmin: user.userType === 'admin' || user.superAdmin
      };
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  });
}