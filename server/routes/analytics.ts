import { Router } from "express";
import { authenticateToken, checkSuperAdminAccess } from "../auth";
import { db } from "@db";
import {
  analyticsLogs,
  leadAnalytics,
  businessAnalytics,
  revenueAnalytics,
  vendorTransactions,
  users,
} from "@db/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { Client } from '@elastic/elasticsearch';
import { logInfo, logError } from "../services/logging";

const router = Router();

// Initialize Elasticsearch client
const esClient = new Client({
  node: 'http://localhost:9200',
  auth: {
    username: process.env.ELASTICSEARCH_USERNAME!,
    password: process.env.ELASTICSEARCH_PASSWORD!
  }
});

// Fetch logs with filtering and search
router.get("/logs", authenticateToken, checkSuperAdminAccess, async (req, res) => {
  try {
    const { search, level, category, from = 0, size = 100, dateFrom, dateTo } = req.query;

    // Build Elasticsearch query
    const query: any = {
      bool: {
        must: [{ match_all: {} }]
      }
    };

    // Add search filter
    if (search) {
      query.bool.must.push({
        multi_match: {
          query: search,
          fields: ['message', 'service', 'category'],
          type: 'phrase_prefix' // Enable partial matching
        }
      });
    }

    // Add level filter
    if (level && level !== 'all') {
      query.bool.must.push({
        match: { level }
      });
    }

    // Add category filter
    if (category && category !== 'all') {
      query.bool.must.push({
        match: { category }
      });
    }

    // Add date range filter
    if (dateFrom || dateTo) {
      const range: any = {};
      if (dateFrom) range.gte = dateFrom;
      if (dateTo) range.lte = dateTo;
      query.bool.must.push({
        range: {
          '@timestamp': range
        }
      });
    }

    // Execute search with caching
    const result = await esClient.search({
      index: 'zecko-logs-*',
      body: {
        query,
        sort: [{ '@timestamp': { order: 'desc' } }],
        from: Number(from),
        size: Number(size),
        track_total_hits: true,
        _source: ['@timestamp', 'level', 'message', 'service', 'category', 'metadata']
      },
      requestCache: true, // Enable request caching
      ignoreUnavailable: true // Continue if some indices are unavailable
    });

    const logs = result.hits.hits.map(hit => ({
      '@timestamp': hit._source['@timestamp'],
      level: hit._source.level,
      message: hit._source.message,
      service: hit._source.service,
      category: hit._source.category,
      metadata: hit._source.metadata || {}
    }));

    res.json(logs);
  } catch (error) {
    logError('Error fetching logs:', {
      error: error instanceof Error ? error.message : String(error)
    });
    res.status(500).json({
      message: "Failed to fetch logs",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

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

// Get analytics dashboard data
router.get("/analytics/dashboard", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get recent activity
    const recentActivity = await db.query.analyticsLogs.findMany({
      where: and(
        eq(analyticsLogs.user_id, req.user.id),
        gte(analyticsLogs.created_at, thirtyDaysAgo)
      ),
      orderBy: (analyticsLogs, { desc }) => [desc(analyticsLogs.created_at)],
      limit: 10,
    });

    let businessMetrics = null;
    let vendorMetrics = null;

    // Get business metrics if applicable
    if (req.user.userType === "business") {
      businessMetrics = await db.query.businessAnalytics.findFirst({
        where: and(
          eq(businessAnalytics.business_id, req.user.id),
          gte(businessAnalytics.period_start, thirtyDaysAgo)
        ),
      });
    }

    // Get vendor metrics if applicable
    if (req.user.userType === "vendor") {
      const vendorTransactionData = await db.query.vendorTransactions.findMany({
        where: and(
          eq(vendorTransactions.vendor_id, req.user.id),
          gte(vendorTransactions.created_at, thirtyDaysAgo)
        ),
        orderBy: (vendorTransactions, { desc }) => [desc(vendorTransactions.created_at)],
      });

      if (vendorTransactionData.length > 0) {
        const totalAmount = vendorTransactionData.reduce((sum, transaction) =>
          sum + transaction.amount, 0);
        const successfulTransactions = vendorTransactionData.filter(t =>
          t.status === "paid").length;

        vendorMetrics = {
          total_transactions: vendorTransactionData.length,
          successful_transactions: successfulTransactions,
          total_amount: totalAmount,
          success_rate: (successfulTransactions / vendorTransactionData.length) * 100,
          transactions: vendorTransactionData.slice(0, 5) // Latest 5 transactions
        };
      }
    }

    // Get revenue metrics
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

export default router;