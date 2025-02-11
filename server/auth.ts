import { Express, Request, Response, NextFunction } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type SelectUser } from "@db/schema";
import { db } from "@db";
import { eq, and } from "drizzle-orm";
import { fromZodError } from "zod-validation-error";
import { log } from "./vite";
import jwt from 'jsonwebtoken';
import { checkLoginAttempts, recordLoginAttempt } from "./services/rate-limiter";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const scryptAsync = promisify(scrypt);
const JWT_SECRET = process.env.REPL_ID!;

// Initialize AWS SES client
const ses = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

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

async function updateUserResetToken(userId: number, token: string | null, expiry: Date | null) {
  try {
    log(`Updating reset token for user ${userId}`);

    await db
      .update(users)
      .set({
        resetPasswordToken: token,
        resetPasswordExpiry: expiry
      })
      .where(eq(users.id, userId))
      .execute();

    log(`Successfully updated reset token for user ${userId}`);
    return true;
  } catch (error) {
    log(`Error updating reset token: ${error}`);
    throw error;
  }
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

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
    if (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, decoded.id), eq(users.active, true)))
        .limit(1);

      if (!user) {
        return res.status(401).json({ message: "User not found or inactive" });
      }

      req.user = user;
      next();
    } catch (error) {
      log(`Database error in auth middleware: ${error}`);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
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

      const [user] = await db.insert(users)
        .values({
          email: result.data.email,
          username: result.data.username,
          password: await hashPassword(result.data.password),
          userType: result.data.userType,
          subscriptionActive: result.data.userType === "free",
          subscriptionTier: result.data.userType === "free" ? "none" : result.data.userType,
          profile: {
            name: result.data.username,
            description: "",
            categories: [],
            location: "",
          },
          active: true,
          businessName: result.data.businessName,
          companyNumber: result.data.companyNumber,
          utrNumber: result.data.utrNumber,
        })
        .returning();

      log(`Registration successful - User ID: ${user.id}, Type: ${user.userType}`);

      const token = generateToken(user);
      res.status(201).json({ user, token });
    } catch (error) {
      log(`Registration error: ${error}`);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const ip = req.ip;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      log(`Login attempt for email: ${email} from IP: ${ip}`);

      const loginCheck = await checkLoginAttempts(ip, email);
      if (!loginCheck.allowed) {
        return res.status(429).json({
          message: `Too many login attempts. Please try again in ${loginCheck.lockoutMinutes} minutes.`,
          lockoutEndTime: loginCheck.lockoutEndTime,
          lockoutMinutes: loginCheck.lockoutMinutes
        });
      }

      const [user] = await getUserByEmail(email);

      if (!user) {
        await recordLoginAttempt({ ip, email, timestamp: new Date(), successful: false });
        return res.status(401).json({
          message: "Invalid credentials",
          remainingAttempts: loginCheck.remainingAttempts
        });
      }

      const isValidPassword = await comparePasswords(password, user.password);
      if (!isValidPassword) {
        await recordLoginAttempt({ ip, email, timestamp: new Date(), successful: false });
        return res.status(401).json({
          message: "Invalid credentials",
          remainingAttempts: loginCheck.remainingAttempts
        });
      }

      await recordLoginAttempt({ ip, email, timestamp: new Date(), successful: true });

      const token = generateToken(user);
      log(`Login successful for user: ${user.id} (${user.userType})`);
      res.json({ user, token });
    } catch (error) {
      log(`Login error: ${error}`);
      res.status(500).json({ message: "Internal server error during login" });
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      log(`Processing forgot password request for email: ${email}`);

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const [user] = await getUserByEmail(email);

      if (!user) {
        log(`No user found with email: ${email}`);
        return res.status(200).json({
          message: "If an account exists with this email, a password reset link will be sent."
        });
      }

      try {
        const resetToken = randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 3600000); // 1 hour

        await updateUserResetToken(user.id, resetToken, resetExpires);

        const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset-password/${resetToken}`;
        const emailParams = {
          Source: process.env.AWS_SES_VERIFIED_EMAIL!,
          Destination: {
            ToAddresses: [email],
          },
          Message: {
            Subject: {
              Data: 'Password Reset Request',
            },
            Body: {
              Text: {
                Data: `You are receiving this email because you requested a password reset.\n\n
                       Please click on the following link to complete the process:\n\n
                       ${resetUrl}\n\n
                       This link will expire in 1 hour.\n\n
                       If you did not request this, please ignore this email.`,
              },
            },
          },
        };

        await ses.send(new SendEmailCommand(emailParams));
        log(`Password reset email sent successfully to ${email}`);

        return res.status(200).json({
          message: "If an account exists with this email, a password reset link will be sent."
        });
      } catch (error) {
        log(`Error in password reset process: ${error}`);
        throw error;
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

  app.post("/api/logout", (req, res) => {
    res.json({ message: "Logged out successfully" });
  });

  app.get("/api/user", authenticateToken, (req, res) => {
    res.json(req.user);
  });
}