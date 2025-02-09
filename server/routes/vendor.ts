import { Router } from "express";
import { authenticateToken } from "../auth";
import { db } from "@db";
import { vendorTransactions, users } from "@db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is required");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16"
});

const router = Router();

// Get vendor's Stripe account balance
router.get("/vendor/balance", authenticateToken, async (req, res) => {
  try {
    if (!req.user || req.user.userType !== "vendor") {
      return res.status(403).json({ message: "Only vendors can access balance information" });
    }

    if (!req.user.stripeAccountId) {
      return res.status(404).json({ message: "No Stripe account found" });
    }

    const balance = await stripe.balance.retrieve({
      stripeAccount: req.user.stripeAccountId,
    });

    return res.json(balance);
  } catch (error) {
    console.error("Error fetching balance:", error);
    return res.status(500).json({ error: "Failed to fetch balance" });
  }
});

// Get vendor's transaction history
router.get("/vendor/transactions", authenticateToken, async (req, res) => {
  try {
    if (!req.user || req.user.userType !== "vendor") {
      return res.status(403).json({ message: "Only vendors can access transactions" });
    }

    const transactions = await db.query.vendorTransactions.findMany({
      where: eq(vendorTransactions.vendor_id, req.user.id),
      orderBy: (vendorTransactions, { desc }) => [desc(vendorTransactions.created_at)],
    });

    return res.json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// Get vendor's payout history from Stripe
router.get("/vendor/payouts", authenticateToken, async (req, res) => {
  try {
    if (!req.user || req.user.userType !== "vendor") {
      return res.status(403).json({ message: "Only vendors can access payout information" });
    }

    if (!req.user.stripeAccountId) {
      return res.status(404).json({ message: "No Stripe account found" });
    }

    const payouts = await stripe.payouts.list({
      stripeAccount: req.user.stripeAccountId,
      limit: 100,
    });

    return res.json(payouts);
  } catch (error) {
    console.error("Error fetching payouts:", error);
    return res.status(500).json({ error: "Failed to fetch payouts" });
  }
});

// Sync vendor transactions with Stripe
router.post("/vendor/transactions/sync", authenticateToken, async (req, res) => {
  try {
    if (!req.user || req.user.userType !== "vendor") {
      return res.status(403).json({ message: "Only vendors can sync transactions" });
    }

    if (!req.user.stripeAccountId) {
      return res.status(404).json({ message: "No Stripe account found" });
    }

    // Get transfers from Stripe
    const transfers = await stripe.transfers.list({
      destination: req.user.stripeAccountId,
      limit: 100,
    });

    // Sync transfers to our database
    for (const transfer of transfers.data) {
      await db.insert(vendorTransactions)
        .values({
          vendor_id: req.user.id,
          stripe_transfer_id: transfer.id,
          amount: transfer.amount,
          status: transfer.reversed ? "failed" : "paid",
          currency: transfer.currency,
          transfer_date: new Date(transfer.created * 1000),
          stripe_charge_id: transfer.source_transaction,
          product_details: transfer.metadata.product_details,
          customer_details: transfer.metadata.customer_details,
        })
        .onConflictDoUpdate({
          target: [vendorTransactions.stripe_transfer_id],
          set: {
            status: transfer.reversed ? "failed" : "paid",
            updated_at: new Date(),
          },
        });
    }

    return res.json({ message: "Transactions synced successfully" });
  } catch (error) {
    console.error("Error syncing transactions:", error);
    return res.status(500).json({ error: "Failed to sync transactions" });
  }
});

export default router;
