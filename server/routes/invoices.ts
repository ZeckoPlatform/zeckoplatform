import { Router } from "express";
import { authenticateToken } from "../auth";
import { db } from "@db";
import { invoices, users, notificationPreferences } from "@db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is required");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16"
});

const router = Router();

// Get all invoices for the authenticated user
router.get("/invoices", authenticateToken, async (req, res) => {
  try {
    const userInvoices = await db
      .select()
      .from(invoices)
      .where(eq(invoices.user_id, req.user!.id))
      .orderBy(invoices.created_at);

    return res.json(userInvoices);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

// Get notification preferences
router.get("/notification-preferences", authenticateToken, async (req, res) => {
  try {
    const [preferences] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.user_id, req.user!.id))
      .limit(1);

    if (!preferences) {
      // Create default preferences if none exist
      const [newPreferences] = await db
        .insert(notificationPreferences)
        .values({
          user_id: req.user!.id,
          renewal_reminder: true,
          reminder_days_before: 7,
          invoice_available: true,
          payment_failed: true,
        })
        .returning();

      return res.json(newPreferences);
    }

    return res.json(preferences);
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return res.status(500).json({ error: "Failed to fetch notification preferences" });
  }
});

// Update notification preferences
router.patch("/notification-preferences", authenticateToken, async (req, res) => {
  try {
    const [updatedPreferences] = await db
      .update(notificationPreferences)
      .set(req.body)
      .where(eq(notificationPreferences.user_id, req.user!.id))
      .returning();

    return res.json(updatedPreferences);
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return res.status(500).json({ error: "Failed to update notification preferences" });
  }
});

// Sync invoices with Stripe
router.post("/invoices/sync", authenticateToken, async (req, res) => {
  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user!.id))
      .limit(1);

    if (!user[0].stripeAccountId) {
      return res.status(400).json({ error: "No Stripe account associated" });
    }

    const stripeInvoices = await stripe.invoices.list({
      customer: user[0].stripeAccountId,
      limit: 100,
    });

    // Sync invoices to our database
    for (const invoice of stripeInvoices.data) {
      await db
        .insert(invoices)
        .values({
          user_id: req.user!.id,
          stripe_invoice_id: invoice.id,
          amount: invoice.amount_due,
          status: invoice.status,
          currency: invoice.currency,
          billing_reason: invoice.billing_reason || "subscription_create",
          invoice_pdf: invoice.invoice_pdf,
          hosted_invoice_url: invoice.hosted_invoice_url,
          created_at: new Date(invoice.created * 1000),
          paid_at: invoice.status === "paid" ? new Date(invoice.status_transitions.paid_at! * 1000) : null,
          period_start: new Date(invoice.period_start * 1000),
          period_end: new Date(invoice.period_end * 1000),
        })
        .onConflictDoUpdate({
          target: [invoices.stripe_invoice_id],
          set: {
            status: invoice.status,
            invoice_pdf: invoice.invoice_pdf,
            hosted_invoice_url: invoice.hosted_invoice_url,
            paid_at: invoice.status === "paid" ? new Date(invoice.status_transitions.paid_at! * 1000) : null,
          },
        });
    }

    return res.json({ message: "Invoices synced successfully" });
  } catch (error) {
    console.error("Error syncing invoices:", error);
    return res.status(500).json({ error: "Failed to sync invoices" });
  }
});

export default router;
