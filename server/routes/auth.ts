import { Router } from "express";
import { authenticateToken, hashPassword } from "../auth";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { log } from "../vite";

const router = Router();

// Password reset request
router.post("/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    log('Processing password reset request for:', email);

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
      log('No user found with email:', email);
      return res.status(200).json({
        message: "If an account exists with this email, you will receive password reset instructions."
      });
    }

    // For now, just acknowledge the request
    // TODO: Implement actual password reset email functionality
    return res.status(200).json({
      message: "If an account exists with this email, you will receive password reset instructions."
    });

  } catch (error) {
    log('Password reset error:', error instanceof Error ? error.message : String(error));
    return res.status(500).json({
      message: "Unable to process password reset request"
    });
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