import { Router } from "express";
import { authenticateToken, checkSuperAdminAccess } from "../auth";
import { db } from "@db";
import { analyticsLogs, users } from "@db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { logInfo, logError } from "../services/logging";
import os from 'os';

const router = Router();

// Analytics initialization state
let analyticsInitialized = false;
let initializationPromise: Promise<void> | null = null;

// In-memory storage initialized as null
let inMemoryLogs: Array<{
  '@timestamp': string;
  level: 'info' | 'error' | 'warning';
  message: string;
  service: string;
  category: string;
  metadata: Record<string, any>;
}> | null = null;

// Metrics cache
const metricsCache = {
  data: null as any,
  lastUpdate: 0,
  ttl: 10000 // 10 seconds
};

// Quick health check endpoint
router.get("/health", (req, res) => {
  res.json({ 
    status: "ok",
    analyticsReady: analyticsInitialized,
    initializationStarted: !!initializationPromise
  });
});

// Initialize analytics after server startup
async function initializeAnalytics() {
  if (initializationPromise) {
    return initializationPromise;
  }

  console.log('Starting analytics initialization...');

  initializationPromise = new Promise<void>(async (resolve) => {
    try {
      // Initialize in-memory logs
      inMemoryLogs = [{
        '@timestamp': new Date().toISOString(),
        level: 'info',
        message: 'Analytics system initialization started',
        service: 'analytics',
        category: 'startup',
        metadata: {
          version: '1.0.0',
          environment: process.env.NODE_ENV
        }
      }];

      // Mark as initialized
      analyticsInitialized = true;
      console.log('Analytics system initialized successfully');
      resolve();
    } catch (error) {
      console.error('Failed to initialize analytics:', error);
      resolve(); // Resolve anyway to prevent hanging
    }
  });

  return initializationPromise;
}

// Get in-memory logs with initialization check
function getInMemoryLogs() {
  if (!analyticsInitialized) {
    throw new Error('Analytics system is not yet initialized');
  }
  return inMemoryLogs!;
}

// Add a log entry
export function addLogEntry(logEntry: typeof inMemoryLogs extends null ? never : typeof inMemoryLogs[0]) {
  if (!analyticsInitialized) {
    console.log('Analytics not ready, buffering log:', logEntry);
    return;
  }

  const logs = getInMemoryLogs();
  logs.unshift(logEntry);
  if (logs.length > 1000) {
    logs.length = 1000;
  }
}


// Fetch logs with filtering and search
router.get("/logs", authenticateToken, checkSuperAdminAccess, async (req, res) => {
  try {
    if (!analyticsInitialized) {
      return res.status(503).json({ 
        error: "Analytics system is initializing",
        retryAfter: 5
      });
    }

    const { search, level, category, from = 0, size = 100, dateFrom, dateTo } = req.query;
    const logs = getInMemoryLogs();

    // Use Set for O(1) lookups
    const levelFilter = level && level !== 'all' ? new Set([level]) : null;
    const categoryFilter = category && category !== 'all' ? new Set([category]) : null;

    const dateFromTime = dateFrom ? new Date(dateFrom as string).getTime() : 0;
    const dateToTime = dateTo ? new Date(dateTo as string).getTime() : Infinity;

    const searchLower = search ? (search as string).toLowerCase() : null;

    // Single pass filtering for better performance
    const filteredLogs = logs.filter(log => {
      // Date filter
      const timestamp = new Date(log['@timestamp']).getTime();
      if (timestamp < dateFromTime || timestamp > dateToTime) return false;

      // Level filter
      if (levelFilter && !levelFilter.has(log.level)) return false;

      // Category filter
      if (categoryFilter && !categoryFilter.has(log.category)) return false;

      // Search filter
      if (searchLower) {
        return log.message.toLowerCase().includes(searchLower) ||
               log.service.toLowerCase().includes(searchLower) ||
               log.category.toLowerCase().includes(searchLower);
      }

      return true;
    });

    res.json(filteredLogs.slice(Number(from), Number(from) + Number(size)));
  } catch (error) {
    logError('Error fetching logs:', error);
    res.status(500).json({
      message: "Failed to fetch logs",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get metrics with caching
router.get("/analytics/metrics", authenticateToken, checkSuperAdminAccess, async (req, res) => {
  try {
    if (!analyticsInitialized) {
      return res.status(503).json({ 
        error: "Analytics system is initializing",
        retryAfter: 5
      });
    }

    const now = Date.now();

    // Return cached metrics if available and not expired
    if (metricsCache.data && (now - metricsCache.lastUpdate) < metricsCache.ttl) {
      return res.json(metricsCache.data);
    }

    // System metrics
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const cpuUsage = os.loadavg()[0] * 100 / os.cpus().length;

    // API metrics from recent logs
    const recentLogs = getInMemoryLogs().filter(log => 
      now - new Date(log['@timestamp']).getTime() <= 5 * 60 * 1000
    );

    const requestCount = recentLogs.length;
    const errorCount = recentLogs.filter(log => log.level === 'error').length;

    // Get active connections (simplified and cached)
    const activeConnections = await db.select({
      count: sql<number>`count(*)::int`
    }).from(users);

    const metrics = {
      system: {
        cpu_usage: cpuUsage,
        memory_used: usedMemory,
        memory_total: totalMemory
      },
      api: {
        request_count: requestCount,
        error_count: errorCount,
        avg_response_time: 0
      },
      database: {
        active_connections: activeConnections[0]?.count || 0,
        query_duration: 0
      }
    };

    // Update cache
    metricsCache.data = metrics;
    metricsCache.lastUpdate = now;

    res.json(metrics);
  } catch (error) {
    logError('Error collecting metrics:', error);
    res.status(500).json({ error: "Failed to collect metrics" });
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

export { initializeAnalytics };
export default router;