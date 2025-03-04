import type { Express, Request, Response, NextFunction } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, type SelectUser } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { log } from "./vite";
import jwt from 'jsonwebtoken';

const scryptAsync = promisify(scrypt);
const JWT_SECRET = process.env.REPL_ID!;

// Temporary debug function
async function debugHashPassword(password: string) {
  const salt = "debugsalt123456789";
  const buf = (await scryptAsync(password, salt, 32)) as Buffer;
  const hash = buf.toString("hex");
  log('Debug: Generated hash', { hash, salt });
  return `${hash}.${salt}`;
}

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required")
});

export function setupAuth(app: Express) {
  // Temporary debug endpoint
  app.post("/api/debug-hash", async (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(404).send();
    }
    const hash = await debugHashPassword(req.body.password);
    res.json({ hash });
  });

  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      log('Login attempt:', { email });

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        log('User not found');
        return res.status(401).json({
          success: false,
          message: "Invalid credentials"
        });
      }

      log('Found user:', { id: user.id });

      // Debug log password check
      const salt = user.password.split('.')[1];
      const inputBuf = (await scryptAsync(password, salt, 32)) as Buffer;
      const inputHash = inputBuf.toString('hex');
      const storedHash = user.password.split('.')[0];

      log('Debug password check:', {
        inputHashLength: inputHash.length,
        storedHashLength: storedHash.length,
        saltUsed: salt
      });

      const isValid = timingSafeEqual(
        Buffer.from(inputHash, 'hex'),
        Buffer.from(storedHash, 'hex')
      );

      if (!isValid) {
        log('Password mismatch');
        return res.status(401).json({
          success: false,
          message: "Invalid credentials"
        });
      }

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

      log('Login successful');
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