import type { Express, Request, Response, NextFunction } from "express";
import { createHash } from "crypto";
import { users } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.REPL_ID!;

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required")
});

export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export function setupAuth(app: Express) {
  app.post("/api/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);

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

      const hashedPassword = hashPassword(validatedData.password);
      if (hashedPassword !== user.password) {
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