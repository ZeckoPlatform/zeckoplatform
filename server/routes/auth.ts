import { Router } from "express";
import { authenticateToken } from "../auth";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { authenticator } from "otplib";
import QRCode from "qrcode";

const router = Router();

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
