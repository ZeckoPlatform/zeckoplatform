import { logError, logInfo } from './logging';
import { notifications } from '@db/schema';
import { db } from '@db';
import { eq } from 'drizzle-orm';

interface AlertThresholds {
  responseTime: number;  // in milliseconds
  errorRate: number;     // percentage
  memoryUsage: number;   // percentage
  diskUsage: number;     // percentage
}

const defaultThresholds: AlertThresholds = {
  responseTime: 1000,    // 1 second
  errorRate: 5,         // 5%
  memoryUsage: 85,      // 85%
  diskUsage: 85         // 85%
};

export async function notifyAdmins(
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info'
) {
  try {
    // Get all admin users
    const adminUsers = await db.query.users.findMany({
      where: eq(users.userType, 'admin')
    });

    // Create notifications for each admin
    for (const admin of adminUsers) {
      await db.insert(notifications).values({
        userId: admin.id,
        title,
        message,
        type,
        read: false,
      });
    }

    logInfo('Admin notification sent', { title, type });
  } catch (error) {
    logError('Failed to send admin notification', {
      error: error instanceof Error ? error.message : String(error),
      title,
      type
    });
  }
}

export async function checkPerformanceMetrics(thresholds: Partial<AlertThresholds> = {}) {
  const metrics = { ...defaultThresholds, ...thresholds };
  
  try {
    // Check response time alerts
    const avgResponseTime = await getAverageResponseTime();
    if (avgResponseTime > metrics.responseTime) {
      await notifyAdmins(
        'High Response Time Alert',
        `Average response time (${avgResponseTime}ms) exceeds threshold (${metrics.responseTime}ms)`,
        'warning'
      );
    }

    // Check error rate alerts
    const errorRate = await getErrorRate();
    if (errorRate > metrics.errorRate) {
      await notifyAdmins(
        'High Error Rate Alert',
        `Error rate (${errorRate}%) exceeds threshold (${metrics.errorRate}%)`,
        'error'
      );
    }

    // Check memory usage
    const memoryUsage = await getMemoryUsage();
    if (memoryUsage > metrics.memoryUsage) {
      await notifyAdmins(
        'High Memory Usage Alert',
        `Memory usage (${memoryUsage}%) exceeds threshold (${metrics.memoryUsage}%)`,
        'warning'
      );
    }

    logInfo('Performance metrics check completed');
  } catch (error) {
    logError('Failed to check performance metrics', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// Helper functions for metric calculations
async function getAverageResponseTime(): Promise<number> {
  // Implementation will use Prometheus metrics
  return 0; // Placeholder
}

async function getErrorRate(): Promise<number> {
  // Implementation will use Prometheus metrics
  return 0; // Placeholder
}

async function getMemoryUsage(): Promise<number> {
  const used = process.memoryUsage();
  return (used.heapUsed / used.heapTotal) * 100;
}
