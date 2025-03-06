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
import { logInfo, logError } from "../services/logging";

const router = Router();

// In-memory log storage for development
let inMemoryLogs: Array<{
  '@timestamp': string;
  level: 'info' | 'error' | 'warning';
  message: string;
  service: string;
  category: string;
  metadata: Record<string, any>;
}> = [];

// Add a log entry
export function addLogEntry(logEntry: typeof inMemoryLogs[0]) {
  inMemoryLogs.unshift(logEntry); // Add to start of array
  if (inMemoryLogs.length > 1000) { // Keep only last 1000 logs
    inMemoryLogs = inMemoryLogs.slice(0, 1000);
  }
}

// Fetch logs with filtering and search
router.get("/logs", authenticateToken, checkSuperAdminAccess, async (req, res) => {
  try {
    logInfo('Logs request received:', {
      query: req.query,
      user: req.user?.email
    });

    const { search, level, category, from = 0, size = 100, dateFrom, dateTo } = req.query;

    // Filter logs based on criteria
    let filteredLogs = [...inMemoryLogs];

    if (search) {
      const searchLower = (search as string).toLowerCase();
      filteredLogs = filteredLogs.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        log.service.toLowerCase().includes(searchLower) ||
        log.category.toLowerCase().includes(searchLower)
      );
    }

    if (level && level !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }

    if (category && category !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.category === category);
    }

    if (dateFrom || dateTo) {
      filteredLogs = filteredLogs.filter(log => {
        const timestamp = new Date(log['@timestamp']).getTime();
        const fromTime = dateFrom ? new Date(dateFrom as string).getTime() : 0;
        const toTime = dateTo ? new Date(dateTo as string).getTime() : Infinity;
        return timestamp >= fromTime && timestamp <= toTime;
      });
    }

    // Add initial system startup log if none exist
    if (inMemoryLogs.length === 0) {
      const startupLog = {
        '@timestamp': new Date().toISOString(),
        level: 'info' as const,
        message: 'System monitoring initialized successfully',
        service: 'system',
        category: 'startup',
        metadata: {
          version: '1.0.0',
          environment: 'development'
        }
      };

      inMemoryLogs.push(startupLog);
      filteredLogs = [startupLog];
    }

    logInfo('Returning filtered logs:', {
      total: filteredLogs.length,
      filters: { search, level, category, dateFrom, dateTo }
    });

    res.json(filteredLogs.slice(Number(from), Number(from) + Number(size)));
  } catch (error) {
    logError('Error fetching logs:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
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

    // Store in database
    const [log] = await db.insert(analyticsLogs)
      .values({
        user_id: req.user.id,
        event_type,
        metadata,
        ip_address: req.ip,
        user_agent: req.headers["user-agent"],
      })
      .returning();

    // Also add to in-memory logs
    addLogEntry({
      '@timestamp': new Date().toISOString(),
      level: 'info',
      message: `User activity: ${event_type}`,
      service: 'analytics',
      category: 'user_activity',
      metadata: {
        userId: req.user.id,
        ...metadata
      }
    });

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