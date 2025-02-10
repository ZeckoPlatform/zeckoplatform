import { Express, Request, Response, NextFunction } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type SelectUser } from "@db/schema";
import { db } from "@db";
import { eq, and, isNull } from "drizzle-orm";
import { fromZodError } from "zod-validation-error";
import { log } from "./vite";
import jwt from 'jsonwebtoken';
import { checkLoginAttempts, recordLoginAttempt } from "./services/rate-limiter";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const scryptAsync = promisify(scrypt);
const JWT_SECRET = process.env.REPL_ID!;

// Initialize AWS SES client with better error handling
const ses = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

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
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        password: users.password,
        userType: users.userType,
        superAdmin: users.superAdmin,
        subscriptionActive: users.subscriptionActive,
        subscriptionTier: users.subscriptionTier,
        active: users.active,
        reset_password_token: users.reset_password_token,
        reset_password_expires: users.reset_password_expires
      })
      .from(users)
      .where(and(eq(users.email, email), eq(users.active, true)));
    log(`Found ${result.length} active users matching email: ${email}`);
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
        const [user] = await db.select({
          id: users.id,
          email: users.email,
          username: users.username,
          userType: users.userType,
          superAdmin: users.superAdmin,
          subscriptionActive: users.subscriptionActive,
          subscriptionTier: users.subscriptionTier,
          active: users.active
        })
        .from(users)
        .where(and(
          eq(users.id, decoded.id),
          eq(users.active, true)
        ));

        if (!user) {
          log('User not found or account deactivated');
          return res.status(401).json({ 
            message: 'Account not active',
            code: 'ACCOUNT_INACTIVE'
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

      // Set initial subscription status based on user type
      const subscriptionActive = result.data.userType === "free";
      const subscriptionTier = result.data.userType === "free" ? "none" : result.data.userType;

      const [user] = await db.insert(users)
        .values({
          email: result.data.email,
          username: result.data.username,
          password: await hashPassword(result.data.password),
          userType: result.data.userType,
          subscriptionActive,
          subscriptionTier,
          profile: profileData,
          active: true 
        })
        .returning();

      log(`Registration successful - User ID: ${user.id}, Type: ${user.userType}, Subscription: ${user.subscriptionActive}`);

      const token = generateToken(user);
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
      const ip = req.ip;
      const { email, password } = req.body;

      log(`Login attempt for email: ${email} from IP: ${ip}`);

      // Check if login attempts are allowed
      const loginCheck = await checkLoginAttempts(ip, email);
      if (!loginCheck.allowed) {
        log(`Login blocked due to too many attempts from IP: ${ip}`);
        return res.status(429).json({
          message: `Too many login attempts. Please try again in ${loginCheck.lockoutMinutes} minutes.`,
          lockoutEndTime: loginCheck.lockoutEndTime,
          lockoutMinutes: loginCheck.lockoutMinutes,
          code: 'TOO_MANY_ATTEMPTS'
        });
      }

      const [user] = await getUserByEmail(email);
      const timestamp = new Date();

      if (!user) {
        await recordLoginAttempt({
          ip,
          email,
          timestamp,
          successful: false
        });

        log(`User not found or account inactive: ${email}`);
        return res.status(401).json({
          message: "Invalid credentials or account inactive",
          remainingAttempts: loginCheck.remainingAttempts
        });
      }

      const isValidPassword = await comparePasswords(password, user.password);
      if (!isValidPassword) {
        await recordLoginAttempt({
          ip,
          email,
          timestamp,
          successful: false,
          userId: user.id
        });

        log(`Invalid password for user: ${email}`);
        return res.status(401).json({
          message: "Invalid credentials",
          remainingAttempts: loginCheck.remainingAttempts
        });
      }

      // Record successful login attempt
      await recordLoginAttempt({
        ip,
        email,
        timestamp,
        successful: true,
        userId: user.id
      });

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

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      if (!user) {
        // Don't reveal whether a user was found or not
        return res.status(200).json({
          message: "If an account exists with this email, a password reset link will be sent."
        });
      }

      // Generate reset token
      const resetToken = randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now

      // Update user with reset token
      await db
        .update(users)
        .set({
          resetPasswordToken: resetToken,
          resetPasswordExpiry: resetExpires
        })
        .where(eq(users.id, user.id));

      try {
        // Send reset email using AWS SES
        const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset-password/${resetToken}`;
        const emailParams = {
          Source: process.env.AWS_SES_VERIFIED_EMAIL || 'noreply@example.com', // Use environment variable
          Destination: {
            ToAddresses: [email],
          },
          Message: {
            Subject: {
              Data: 'Password Reset Request',
            },
            Body: {
              Text: {
                Data: `You are receiving this email because you (or someone else) requested a password reset.\n\n
                       Please click on the following link to complete the process:\n\n
                       ${resetUrl}\n\n
                       This link will expire in 1 hour.\n\n
                       If you did not request this, please ignore this email and your password will remain unchanged.`,
              },
            },
          },
        };

        await ses.send(new SendEmailCommand(emailParams));

        log(`Password reset email sent successfully to ${email}`);
      } catch (emailError) {
        log(`Failed to send password reset email: ${emailError}`);
        // Don't expose email sending errors to the client
      }

      // Always return success to prevent email enumeration
      res.status(200).json({
        message: "If an account exists with this email, a password reset link will be sent."
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;

      // Debug logging
      log(`Password reset attempt - Token present: ${!!token}, Password present: ${!!password}`);
      if (token) log(`Token length: ${token.length}`);

      if (!token || !password) {
        log(`Missing required fields - Token: ${!!token}, Password: ${!!password}`);
        return res.status(400).json({ 
          message: "Token and new password are required",
          code: 'INVALID_RESET_REQUEST'
        });
      }

      // Find user with valid reset token
      const [user] = await db
        .select()
        .from(users)
        .where(and(
          eq(users.resetPasswordToken, token),
          eq(users.active, true)
        ));

      if (!user) {
        log('No user found with provided reset token');
        return res.status(400).json({ 
          message: "Password reset token is invalid or has expired",
          code: 'INVALID_TOKEN'
        });
      }

      // Check if token is expired
      if (user.resetPasswordExpiry && new Date(user.resetPasswordExpiry) < new Date()) {
        log('Reset token has expired');
        return res.status(400).json({ 
          message: "Password reset token has expired",
          code: 'TOKEN_EXPIRED'
        });
      }

      // Update password and clear reset token
      await db
        .update(users)
        .set({
          password: await hashPassword(password),
          resetPasswordToken: null,
          resetPasswordExpiry: null
        })
        .where(eq(users.id, user.id));

      log(`Successfully reset password for user: ${user.id}`);
      res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      log(`Password reset error: ${error}`);
      console.error('Password reset error:', error);
      res.status(500).json({ 
        message: "Failed to reset password",
        code: 'RESET_ERROR'
      });
    }
  });
}