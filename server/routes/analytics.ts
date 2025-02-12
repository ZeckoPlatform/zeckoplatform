import { Router } from "express";
import { authenticateToken } from "../auth";
import { db } from "@db";
import {
  analyticsLogs,
  leadAnalytics,
  businessAnalytics,
  revenueAnalytics,
  vendorTransactions,
  users,
} from "@db/schema";
import { eq, and, gte, lte, sql, desc, count, sum, avg } from "drizzle-orm";
import OpenAI from "openai";

const router = Router();
const openai = new OpenAI();

// Log user activity
router.post("/analytics/log", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { event_type, metadata } = req.body;
    const [log] = await db.insert(analyticsLogs)
      .values({
        user_id: req.user.id,
        event_type,
        metadata,
        ip_address: req.ip,
        user_agent: req.headers["user-agent"],
      })
      .returning();

    res.json(log);
  } catch (error) {
    console.error("Analytics log error:", error);
    res.status(500).json({
      message: "Failed to log analytics",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get business analytics
router.get("/analytics/business", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (req.user.userType !== "business") {
      return res.status(403).json({ message: "Only business accounts can access business analytics" });
    }

    const { period_start, period_end } = req.query;

    const analytics = await db.query.businessAnalytics.findFirst({
      where: and(
        eq(businessAnalytics.business_id, req.user.id),
        gte(businessAnalytics.period_start, new Date(period_start as string)),
        lte(businessAnalytics.period_end, new Date(period_end as string))
      ),
      with: {
        business: true,
      },
    });

    res.json(analytics);
  } catch (error) {
    console.error("Business analytics fetch error:", error);
    res.status(500).json({
      message: "Failed to fetch business analytics",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get revenue analytics
router.get("/analytics/revenue", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { period_type, period_start, period_end } = req.query;

    const analytics = await db.query.revenueAnalytics.findFirst({
      where: and(
        eq(revenueAnalytics.user_id, req.user.id),
        eq(revenueAnalytics.period_type, period_type as string),
        gte(revenueAnalytics.period_start, new Date(period_start as string)),
        lte(revenueAnalytics.period_end, new Date(period_end as string))
      ),
    });

    res.json(analytics);
  } catch (error) {
    console.error("Revenue analytics fetch error:", error);
    res.status(500).json({
      message: "Failed to fetch revenue analytics",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get lead analytics
router.get("/analytics/leads", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { lead_id } = req.query;

    const analytics = await db.query.leadAnalytics.findFirst({
      where: eq(leadAnalytics.lead_id, parseInt(lead_id as string)),
      with: {
        lead: true,
      },
    });

    res.json(analytics);
  } catch (error) {
    console.error("Lead analytics fetch error:", error);
    res.status(500).json({
      message: "Failed to fetch lead analytics",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Enhanced dashboard analytics
router.get("/analytics/dashboard", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get recent activity with enhanced metrics
    const recentActivity = await db.query.analyticsLogs.findMany({
      where: and(
        eq(analyticsLogs.user_id, req.user.id),
        gte(analyticsLogs.created_at, thirtyDaysAgo)
      ),
      orderBy: [desc(analyticsLogs.created_at)],
      limit: 10,
    });

    let businessMetrics = null;
    let vendorMetrics = null;

    // Enhanced business metrics
    if (req.user.userType === "business") {
      businessMetrics = await db.query.businessAnalytics.findFirst({
        where: and(
          eq(businessAnalytics.business_id, req.user.id),
          gte(businessAnalytics.period_start, thirtyDaysAgo)
        ),
        with: {
          business: true,
        },
      });

      // Calculate additional metrics if not present
      if (businessMetrics) {
        const totalTransactions = await db.select({ 
          count: count()
        }).from(vendorTransactions)
        .where(gte(vendorTransactions.created_at, thirtyDaysAgo));

        const avgOrderValue = await db.select({ 
          avg: avg(vendorTransactions.amount)
        }).from(vendorTransactions)
        .where(gte(vendorTransactions.created_at, thirtyDaysAgo));

        businessMetrics.performance_metrics = {
          daily_sales: totalTransactions[0].count / 30,
          monthly_sales: totalTransactions[0].count,
          avg_order_value: avgOrderValue[0].avg || 0,
        };
      }
    }

    // Enhanced vendor metrics
    if (req.user.userType === "vendor") {
      const vendorTransactionData = await db.query.vendorTransactions.findMany({
        where: and(
          eq(vendorTransactions.vendor_id, req.user.id),
          gte(vendorTransactions.created_at, thirtyDaysAgo)
        ),
        orderBy: [desc(vendorTransactions.created_at)],
      });

      if (vendorTransactionData.length > 0) {
        const totalAmount = vendorTransactionData.reduce((sum, transaction) =>
          sum + transaction.amount, 0);
        const successfulTransactions = vendorTransactionData.filter(t =>
          t.status === "paid").length;

        // Calculate market insights
        const categoryPrices = vendorTransactionData.map(t => 
          t.product_details?.unit_price || 0);
        const avgCategoryPrice = categoryPrices.reduce((a, b) => a + b, 0) / categoryPrices.length;

        vendorMetrics = {
          total_transactions: vendorTransactionData.length,
          successful_transactions: successfulTransactions,
          total_amount: totalAmount,
          success_rate: (successfulTransactions / vendorTransactionData.length) * 100,
          transactions: vendorTransactionData.slice(0, 5), // Latest 5 transactions
          market_insights: {
            category_avg_price: avgCategoryPrice,
            price_trend: await analyzePriceTrend(vendorTransactionData),
            market_share: await calculateMarketShare(req.user.id)
          },
          inventory_metrics: await calculateInventoryMetrics(vendorTransactionData)
        };
      }
    }

    // Get enhanced revenue metrics
    const revenueMetrics = await db.query.revenueAnalytics.findFirst({
      where: and(
        eq(revenueAnalytics.user_id, req.user.id),
        eq(revenueAnalytics.period_type, "monthly"),
        gte(revenueAnalytics.period_start, thirtyDaysAgo)
      ),
    });

    res.json({
      recentActivity,
      businessMetrics,
      vendorMetrics,
      revenueMetrics,
    });
  } catch (error) {
    console.error("Dashboard analytics fetch error:", error);
    res.status(500).json({
      message: "Failed to fetch dashboard analytics",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Helper functions for advanced analytics
async function analyzePriceTrend(transactions) {
  try {
    const prices = transactions.map(t => ({
      price: t.product_details?.unit_price || 0,
      date: t.created_at
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (prices.length < 2) return "insufficient_data";

    const firstPrice = prices[0].price;
    const lastPrice = prices[prices.length - 1].price;
    const priceDiff = ((lastPrice - firstPrice) / firstPrice) * 100;

    if (priceDiff > 5) return "increasing";
    if (priceDiff < -5) return "decreasing";
    return "stable";
  } catch (error) {
    console.error("Price trend analysis error:", error);
    return "analysis_error";
  }
}

async function calculateMarketShare(vendorId) {
  try {
    const vendorTotal = await db.select({
      total: sum(vendorTransactions.amount)
    })
    .from(vendorTransactions)
    .where(eq(vendorTransactions.vendor_id, vendorId));

    const marketTotal = await db.select({
      total: sum(vendorTransactions.amount)
    })
    .from(vendorTransactions);

    if (!marketTotal[0].total) return 0;
    return ((vendorTotal[0].total || 0) / marketTotal[0].total) * 100;
  } catch (error) {
    console.error("Market share calculation error:", error);
    return 0;
  }
}

async function calculateInventoryMetrics(transactions) {
  try {
    const products = transactions.reduce((acc, t) => {
      const sku = t.product_details?.sku;
      if (sku) {
        acc[sku] = acc[sku] || { sales: 0, inventory: t.product_details?.inventory_count || 0 };
        acc[sku].sales += t.product_details?.quantity || 0;
      }
      return acc;
    }, {});

    const metrics = {
      turnover_rate: 0,
      low_stock_items: 0,
      out_of_stock_items: 0
    };

    Object.values(products).forEach(product => {
      metrics.turnover_rate += product.sales / (product.inventory || 1);
      if (product.inventory < 10) metrics.low_stock_items++;
      if (product.inventory === 0) metrics.out_of_stock_items++;
    });

    metrics.turnover_rate /= Object.keys(products).length || 1;
    return metrics;
  } catch (error) {
    console.error("Inventory metrics calculation error:", error);
    return null;
  }
}

export default router;