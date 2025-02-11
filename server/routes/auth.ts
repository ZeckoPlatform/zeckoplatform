import { Router } from "express";
import { authenticateToken } from "../auth";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { hashPassword } from "../auth";
import { sendPasswordResetEmail } from "../services/email";
import { log } from "../vite";

const router = Router();

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

// Register new user with trial verification
router.post("/auth/register", async (req, res) => {
  try {
    const { email, companyNumber, vatNumber, utrNumber, userType, ...otherData } = req.body;

    // Check trial eligibility
    const eligibility = await checkTrialEligibility({
      email,
      companyNumber,
      vatNumber,
      utrNumber,
      userType,
    });

    if (!eligibility.eligible) {
      return res.status(400).json({
        message: eligibility.reason || "Not eligible for trial",
      });
    }

    // Create user
    const [user] = await db
      .insert(users)
      .values({
        email,
        companyNumber,
        vatNumber,
        utrNumber,
        userType,
        ...otherData,
      })
      .returning();

    // Record trial usage
    await recordTrialUsage(user.id, {
      email,
      companyNumber,
      vatNumber,
      utrNumber,
      userType,
    });

    res.status(201).json(user);
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      message: "Failed to register user",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Delete account with verification
router.delete("/auth/account", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const deleteCheck = await canDeleteAccount(req.user.id);
    if (!deleteCheck.allowed) {
      return res.status(400).json({
        message: deleteCheck.reason || "Account cannot be deleted at this time",
      });
    }

    // Instead of deleting, mark the account as inactive
    await db
      .update(users)
      .set({
        active: false,
        deactivatedAt: new Date(),
      })
      .where(eq(users.id, req.user.id));

    res.json({ message: "Account deactivated successfully" });
  } catch (error) {
    console.error("Account deletion error:", error);
    res.status(500).json({
      message: "Failed to delete account",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Enable 2FA for a user
router.post("/auth/2fa/enable", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Generate a secret
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(
      req.user.email,
      "Zecko Marketplace",
      secret
    );

    // Generate QR code
    const qrCode = await QRCode.toDataURL(otpauth);

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      authenticator.generateSecret().slice(0, 8)
    );

    // Save secret and backup codes
    await db
      .update(users)
      .set({
        twoFactorSecret: secret,
        backupCodes: backupCodes,
      })
      .where(eq(users.id, req.user.id));

    res.json({
      qrCode,
      backupCodes,
      secret, // Only shown once during setup
    });
  } catch (error) {
    console.error("2FA setup error:", error);
    res.status(500).json({
      message: "Failed to set up 2FA",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Verify and activate 2FA
router.post("/auth/2fa/verify", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.id));

    if (!user.twoFactorSecret) {
      return res.status(400).json({ message: "2FA not set up" });
    }

    const isValid = authenticator.verify({
      token,
      secret: user.twoFactorSecret,
    });

    if (!isValid) {
      return res.status(400).json({ message: "Invalid token" });
    }

    // Enable 2FA
    await db
      .update(users)
      .set({ twoFactorEnabled: true })
      .where(eq(users.id, req.user.id));

    res.json({ message: "2FA enabled successfully" });
  } catch (error) {
    console.error("2FA verification error:", error);
    res.status(500).json({
      message: "Failed to verify 2FA",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Disable 2FA
router.post("/auth/2fa/disable", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    await db
      .update(users)
      .set({
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: null,
      })
      .where(eq(users.id, req.user.id));

    res.json({ message: "2FA disabled successfully" });
  } catch (error) {
    console.error("2FA disable error:", error);
    res.status(500).json({
      message: "Failed to disable 2FA",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;