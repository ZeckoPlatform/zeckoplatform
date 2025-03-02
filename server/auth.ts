import type { Express, Request, Response, NextFunction } from "express";
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

      req.user = user;
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

async function getUserByEmail(email: string): Promise<SelectUser[]> {
  try {
    log(`Looking up user with email: ${email}`);
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    log(`Found ${result.length} users`);
    return result;
  } catch (error) {
    log(`Database error in getUserByEmail: ${error}`);
    throw error;
  }
}

export function setupAuth(app: Express) {
  app.post("/api/register", async (req, res) => {
    try {
      log(`Registration attempt - Data received:`, req.body);
      const result = insertUserSchema.safeParse(req.body);

      if (!result.success) {
        log(`Validation failed: ${fromZodError(result.error).toString()}`);
        return res.status(400).json({ message: fromZodError(result.error).toString() });
      }

      // Check for existing email
      const [existingUser] = await getUserByEmail(result.data.email);

      if (existingUser) {
        log(`Registration failed: Email ${result.data.email} already exists`);
        return res.status(400).json({ message: "Email already registered" });
      }

      const [user] = await db
        .insert(users)
        .values({
          ...result.data,
          password: await hashPassword(result.data.password),
        })
        .returning();

      const token = generateToken(user);
      log(`User created successfully: ID ${user.id}`);

      res.status(201).json({ user, token });
    } catch (error: any) {
      log(`Registration error: ${error.message}`);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      log(`Login attempt for email: ${email}`);

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const [user] = await getUserByEmail(email);

      if (!user) {
        log(`No user found with email: ${email}`);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await comparePasswords(password, user.password);
      if (!isValidPassword) {
        log(`Invalid password for user: ${email}`);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Generate JWT token
      const token = generateToken(user);
      log(`Login successful for user: ${user.id}`);

      // Send response with user data and token
      res.json({ user, token });
    } catch (error) {
      log(`Login error: ${error}`);
      res.status(500).json({ message: "Internal server error during login" });
    }
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });


  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      log(`Processing forgot password request for email: ${email}`);

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const [user] = await getUserByEmail(email);

      // Don't reveal if user exists
      if (!user) {
        log(`No user found with email: ${email}`);
        return res.status(200).json({
          message: "If an account exists with this email, a password reset link will be sent."
        });
      }

      try {
        const resetToken = randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 3600000); // 1 hour

        // Update user with reset token
        await updateUserResetToken(user.id, resetToken, resetExpires);

        // Generate reset URL
        const protocol = req.protocol;
        const host = req.get('host');
        const resetUrl = `${protocol}://${host}/reset-password/${resetToken}`;

        try {
          // Send email
          await sendPasswordResetEmail(email, resetToken, resetUrl);

          return res.status(200).json({
            message: "If an account exists with this email, a password reset link will be sent."
          });

        } catch (error: any) {
          log(`Failed to send password reset email: ${error.message}`);

          // Check if it's a verification error
          if (error.message?.includes('needs to be verified')) {
            return res.status(400).json({
              message: error.message
            });
          }

          return res.status(500).json({ 
            message: "Unable to send password reset email. Please try again later or contact support."
          });
        }

      } catch (error) {
        log(`Error in password reset process: ${error}`);
        // Don't leak error details to the client
        return res.status(500).json({ 
          message: "Unable to process password reset request. Please try again later or contact support."
        });
      }
    } catch (error) {
      log(`Password reset request error: ${error}`);
      return res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.resetPasswordToken, token))
        .limit(1);

      if (!user || !user.resetPasswordExpiry || new Date(user.resetPasswordExpiry) < new Date()) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      await db
        .update(users)
        .set({
          password: await hashPassword(password),
          resetPasswordToken: null,
          resetPasswordExpiry: null
        })
        .where(eq(users.id, user.id))
        .execute();

      log(`Successfully reset password for user: ${user.id}`);
      return res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      log(`Password reset error: ${error}`);
      return res.status(500).json({ message: "Failed to reset password" });
    }
  });

  app.get("/api/user", authenticateToken, (req, res) => {
    res.json(req.user);
  });
}

export async function updateUserResetToken(userId: number, token: string | null, expiry: Date | null) {
  try {
    log(`Updating reset token for user ${userId}`);

    const [updated] = await db
      .update(users)
      .set({
        resetPasswordToken: token,
        resetPasswordExpiry: expiry
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      throw new Error('Failed to update user reset token');
    }

    log(`Successfully updated reset token for user ${userId}`);
    return true;
  } catch (error) {
    log(`Error updating reset token: ${error}`);
    throw error;
  }
}

// Added this function because it's referenced but not defined
async function sendPasswordResetEmail(email: string, token: string, url: string): Promise<void> {
  //Implementation to send email using a service like nodemailer would go here.  This is a placeholder.
  console.log(`Email sent to ${email} with reset token ${token} and url ${url}`);
}