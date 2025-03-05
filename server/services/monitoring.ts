import promClient from 'prom-client';
import { log } from '../vite';
import { logInfo, logError } from './logging';

// Initialize the Prometheus registry
const register = new promClient.Registry();

// System metrics
const cpuUsageGauge = new promClient.Gauge({
  name: 'process_cpu_usage_percent',
  help: 'Process CPU usage percentage'
});

const memoryUsageGauge = new promClient.Gauge({
  name: 'process_memory_usage_bytes',
  help: 'Process memory usage in bytes',
  labelNames: ['type']
});

// HTTP metrics
const httpRequestDurationHistogram = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestsTotalCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// Database metrics
const databaseQueryDurationHistogram = new promClient.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type', 'table'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const activeConnectionsGauge = new promClient.Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections'
});

const errorCounter = new promClient.Counter({
  name: 'error_total',
  help: 'Total number of errors',
  labelNames: ['type']
});

// Register all metrics
register.registerMetric(cpuUsageGauge);
register.registerMetric(memoryUsageGauge);
register.registerMetric(httpRequestDurationHistogram);
register.registerMetric(httpRequestsTotalCounter);
register.registerMetric(databaseQueryDurationHistogram);
register.registerMetric(activeConnectionsGauge);
register.registerMetric(errorCounter);

// Initialize monitoring
export const initializeMonitoring = () => {
  try {
    log('Initializing Prometheus monitoring...');

    // Start collecting default metrics
    promClient.collectDefaultMetrics({
      register,
      prefix: 'zecko_',
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
    });

    // Start periodic system metrics collection
    setInterval(async () => {
      try {
        // Update memory metrics
        const used = process.memoryUsage();
        Object.entries(used).forEach(([key, value]) => {
          memoryUsageGauge.labels(key).set(value);
        });

        // Calculate CPU usage percentage
        const startUsage = process.cpuUsage();
        const startTime = process.hrtime();

        // Wait a bit to measure CPU usage
        await new Promise(resolve => setTimeout(resolve, 100));

        const elapsedTime = process.hrtime(startTime);
        const elapsedUsage = process.cpuUsage(startUsage);

        // Calculate CPU usage percentage
        const elapsedMs = elapsedTime[0] * 1000 + elapsedTime[1] / 1000000;
        const cpuPercent = ((elapsedUsage.user + elapsedUsage.system) / 1000) / elapsedMs * 100;

        cpuUsageGauge.set(cpuPercent);

        log('Updated system metrics:', {
          cpu: cpuPercent,
          memory: used
        });

      } catch (error) {
        logError('Error collecting system metrics:', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, 1000);

    log('Prometheus monitoring initialized successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('Failed to initialize monitoring:', errorMessage);
    throw error;
  }
};

// Middleware to track HTTP requests
export const metricsMiddleware = (req: any, res: any, next: any) => {
  const start = Date.now();

  res.on('finish', () => {
    try {
      const duration = Date.now() - start;
      const route = req.route?.path || req.path;

      // Record request metrics
      httpRequestDurationHistogram
        .labels(req.method, route, res.statusCode.toString())
        .observe(duration / 1000);

      httpRequestsTotalCounter
        .labels(req.method, route, res.statusCode.toString())
        .inc();

      // Track errors
      if (res.statusCode >= 400) {
        errorCounter.labels(res.statusCode >= 500 ? 'server' : 'client').inc();
      }

      log('Recorded request metrics:', {
        method: req.method,
        route,
        statusCode: res.statusCode,
        duration
      });

    } catch (error) {
      log('Error recording metrics:', error instanceof Error ? error.message : String(error));
    }
  });

  next();
};

// Get all metrics with JSON format
export const getMetricsAsJSON = async () => {
  try {
    log('Getting metrics as JSON...');
    const metrics = await register.getMetricsAsJSON();
    log('Retrieved metrics:', metrics);
    return metrics;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('Failed to collect metrics as JSON:', errorMessage);
    throw error;
  }
};

// Get metrics in Prometheus format
export const getMetrics = async () => {
  try {
    log('Getting metrics in Prometheus format...');
    const metrics = await register.metrics();
    log('Retrieved metrics length:', metrics.length);
    return metrics;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('Failed to collect metrics:', errorMessage);
    throw error;
  }
};

// Database metrics tracking functions
export const trackDatabaseQuery = (queryType: string, table: string, duration: number) => {
  try {
    databaseQueryDurationHistogram
      .labels(queryType, table)
      .observe(duration / 1000);

    log('Recorded database query metric:', {
      type: queryType,
      table,
      duration
    });
  } catch (error) {
    logError('Error recording database metric:', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

export const updateDatabaseConnections = (count: number) => {
  try {
    activeConnectionsGauge.set(count);
    log('Updated database connections count:', count);
  } catch (error) {
    logError('Error updating database connections:', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// Error tracking function
export const trackError = (type: string) => {
  try {
    errorCounter.labels(type).inc();
    log('Recorded error:', { type });
  } catch (error) {
    logError('Error recording error metric:', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// Export registry for direct access if needed
export const prometheusRegistry = register;