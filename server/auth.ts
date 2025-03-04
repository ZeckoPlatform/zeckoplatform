import type { Express, Request, Response, NextFunction } from "express";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { users, type SelectUser } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { log } from "./vite";
import jwt from 'jsonwebtoken';

const scryptAsync = promisify(scrypt);
const JWT_SECRET = process.env.REPL_ID!;

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required")
});

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, 32)) as Buffer;
  return `${derivedKey.toString('hex')}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  try {
    const [hash, salt] = stored.split('.');
    const derivedKey = (await scryptAsync(supplied, salt, 32)) as Buffer;
    return derivedKey.toString('hex') === hash;
  } catch (error) {
    log('Password comparison error:', error);
    return false;
  }
}

export function setupAuth(app: Express) {
  app.post("/api/login", async (req, res) => {
    try {
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
      const isValid = await comparePasswords(validatedData.password, user.password);

      if (!isValid) {
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

      res.json({
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
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  });

  app.post("/api/logout", (req, res) => {
    res.json({ success: true });
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
        id: user.id,
        email: user.email,
        userType: user.userType,
        superAdmin: user.superAdmin
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