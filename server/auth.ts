import type { Express, Request, Response, NextFunction } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type SelectUser } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { fromZodError } from "zod-validation-error";
import { log } from "./vite";
import jwt from 'jsonwebtoken';
import { checkLoginAttempts, recordLoginAttempt } from "./services/rate-limiter";
import { sendPasswordResetEmail } from "./services/email";

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

export function setupAuth(app: Express) {
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({
          message: "Email and password are required"
        });
      }

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

      // Successful login
      const token = generateToken(user);
      log(`Login successful for user: ${user.id}`);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          userType: user.userType,
          subscriptionActive: user.subscriptionActive,
          subscriptionTier: user.subscriptionTier
        },
        token
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
      log(`Registration attempt - Data received:`, req.body);
      const result = insertUserSchema.safeParse(req.body);

      if (!result.success) {
        log(`Validation failed: ${fromZodError(result.error).toString()}`);
        return res.status(400).json({ message: fromZodError(result.error).toString() });
      }

      const [existingEmail] = await getUserByEmail(result.data.email);

      if (existingEmail) {
        log(`Registration failed: Email ${result.data.email} already exists`);
        return res.status(400).json({ message: "Email already registered" });
      }

      const userData = {
        email: result.data.email,
        password: await hashPassword(result.data.password),
        userType: result.data.userType,
        countryCode: result.data.countryCode,
        active: true,
        subscriptionActive: result.data.userType === "free",
        subscriptionTier: result.data.userType === "free" ? "none" : result.data.userType,
      };

      const [user] = await db.insert(users)
        .values(userData)
        .returning();

      log(`User created successfully: ID ${user.id}, Type: ${user.userType}`);

      const token = generateToken(user);
      res.status(201).json({ user, token });
    } catch (error: any) {
      log(`Registration error: ${error.message}`);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/logout", (req, res) => {
    res.json({ message: "Logged out successfully" });
  });

  app.get("/api/user", authenticateToken, (req, res) => {
    res.json(req.user);
  });
}

async function getUserByEmail(email: string): Promise<SelectUser[]> {
  if (!email) {
    throw new Error('Email is required');
  }

  try {
    log(`Attempting to find user with email: ${email}`);
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    log(`Found ${result.length} users with email ${email}`);
    return result;
  } catch (error) {
    log(`Database error in getUserByEmail: ${error}`);
    throw error;
  }
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