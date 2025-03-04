import { Router } from "express";
import { authenticateToken } from "../auth";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";
import { sendPasswordResetEmail } from "../services/email";
import { log } from "../vite";

const router = Router();
const scryptAsync = promisify(scrypt);

// Local password hashing function since we don't want to export it from auth.ts
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 32)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

// Password reset request - Production implementation
router.post("/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    log(`Processing forgot password request for email: ${email}`);

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    // Always return the same message to prevent user enumeration
    if (!user) {
      log(`No user found with email: ${email}`);
      return res.status(200).json({
        message: "If an account exists with this email, you will receive password reset instructions."
      });
    }

    try {
      const resetToken = randomBytes(32).toString('hex');
      const resetExpiry = new Date(Date.now() + 3600000); // 1 hour

      // Update user with reset token
      await db
        .update(users)
        .set({
          resetPasswordToken: resetToken,
          resetPasswordExpiry: resetExpiry
        })
        .where(eq(users.id, user.id));

      // Generate reset URL
      const protocol = req.protocol;
      const host = req.get('host');
      const resetUrl = `${protocol}://${host}/reset-password/${resetToken}`;

      try {
        // Send email using the email service
        await sendPasswordResetEmail(email, resetToken, resetUrl);

        return res.status(200).json({
          message: "If an account exists with this email, you will receive password reset instructions."
        });
      } catch (error: any) {
        log(`Failed to send password reset email: ${error.message}`);

        // Check if it's a verification error
        if (error.message.includes('needs to be verified')) {
          return res.status(400).json({
            message: error.message
          });
        }

        // For other errors, use a generic message
        return res.status(500).json({
          message: "Unable to send password reset email. Please try again later or contact support."
        });
      }

    } catch (error) {
      log(`Error in password reset process: ${error}`);
      return res.status(500).json({
        message: "Unable to process password reset request. Please try again later or contact support."
      });
    }
  } catch (error) {
    log(`Password reset request error: ${error}`);
    return res.status(500).json({ message: "Failed to process password reset request" });
  }
});

// Verify reset token and set new password
router.post("/auth/reset-password/confirm", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required" });
    }

    // Find user with valid reset token
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.resetPasswordToken, token));

    if (!user || !user.resetPasswordExpiry || user.resetPasswordExpiry < new Date()) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    // Update password and clear reset token
    const hashedPassword = await hashPassword(newPassword);
    await db
      .update(users)
      .set({
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpiry: null
      })
      .where(eq(users.id, user.id));

    res.json({ message: "Password has been reset successfully" });
  } catch (error) {
    log("Password reset confirmation error:", error);
    res.status(500).json({
      message: "Unable to reset password. Please try again later or contact support."
    });
  }
});

export default router;
