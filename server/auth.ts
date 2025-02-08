import { Express, Request, Response, NextFunction } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type SelectUser } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { fromZodError } from "zod-validation-error";
import { log } from "./vite";
import jwt from 'jsonwebtoken';

const scryptAsync = promisify(scrypt);
const JWT_SECRET = process.env.REPL_ID!;

declare global {
  namespace Express {
    interface Request {
      user?: SelectUser;
    }
  }
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

async function getUserByEmail(email: string): Promise<SelectUser[]> {
  try {
    log(`Fetching user with email: ${email}`);
    const result = await db.select().from(users).where(eq(users.email, email));
    log(`Found ${result.length} users matching email: ${email}`);
    return result;
  } catch (error) {
    log(`Database error in getUserByEmail: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error('Database error occurred');
  }
}

function generateToken(user: SelectUser) {
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

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      log('No token provided');
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
      if (err) {
        log(`Token verification failed: ${err.message}`);
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ 
            message: 'Token has expired',
            code: 'TOKEN_EXPIRED'
          });
        }
        return res.status(401).json({ 
          message: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }

      try {
        const [user] = await db.select()
          .from(users)
          .where(eq(users.id, decoded.id));

        if (!user) {
          log('User not found in database');
          return res.status(401).json({ 
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          });
        }

        // Update token if user subscription status has changed
        if (user.subscriptionActive !== decoded.subscriptionActive ||
            user.subscriptionTier !== decoded.subscriptionTier) {
          const newToken = generateToken(user);
          res.setHeader('X-New-Token', newToken);
        }

        req.user = user;
        next();
      } catch (dbError) {
        log(`Database error during authentication: ${dbError}`);
        return res.status(500).json({ 
          message: 'Internal server error during authentication',
          code: 'AUTH_DB_ERROR'
        });
      }
    });
  } catch (error) {
    log(`Authentication middleware error: ${error}`);
    return res.status(500).json({ 
      message: 'Internal server error in auth middleware',
      code: 'AUTH_INTERNAL_ERROR'
    });
  }
}

export function setupAuth(app: Express) {
  app.post("/api/register", async (req, res) => {
    try {
      log(`Registration attempt - Email: ${req.body.email}, Username: ${req.body.username}, Type: ${req.body.userType}`);
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).toString() });
      }

      // Check for existing email
      const [existingEmail] = await db.select()
        .from(users)
        .where(eq(users.email, result.data.email));

      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Check for existing username
      const [existingUsername] = await db.select()
        .from(users)
        .where(eq(users.username, result.data.username));

      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const profileData = {
        name: result.data.username,
        description: "",
        categories: [],
        location: "",
      };

      const [user] = await db.insert(users)
        .values({
          email: result.data.email,
          username: result.data.username,
          password: await hashPassword(result.data.password),
          userType: result.data.userType,
          subscriptionActive: false,
          subscriptionTier: "none",
          profile: profileData,
        })
        .returning();

      const token = generateToken(user);
      log(`Registration successful for user: ${user.id} (${user.userType})`);
      res.status(201).json({ user, token });
    } catch (error) {
      log(`Registration error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Full error:', error);
      res.status(500).json({ 
        message: "Registration failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      log(`Login attempt for email: ${req.body.email}`);
      const [user] = await getUserByEmail(req.body.email);

      if (!user) {
        log(`User not found: ${req.body.email}`);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await comparePasswords(req.body.password, user.password);
      if (!isValidPassword) {
        log(`Invalid password for user: ${req.body.email}`);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = generateToken(user);
      log(`Login successful for user: ${user.id} (${user.userType})`);
      res.json({ user, token });
    } catch (error) {
      log(`Login error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Full error:', error);
      res.status(500).json({ 
        message: "Internal server error during login",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/logout", (req, res) => {
    res.json({ message: "Logged out successfully" });
  });

  app.get("/api/user", authenticateToken, (req, res) => {
    res.json(req.user);
  });
}