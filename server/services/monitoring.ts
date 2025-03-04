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
    setInterval(() => {
      // Update memory metrics
      const used = process.memoryUsage();
      Object.entries(used).forEach(([key, value]) => {
        memoryUsageGauge.labels(key).set(value);
      });

      // Update CPU metrics
      const startUsage = process.cpuUsage();
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const totalUsage = (endUsage.user + endUsage.system) / 1000000; // Convert to seconds
        cpuUsageGauge.set(totalUsage * 100); // Convert to percentage
      }, 100);
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

    } catch (error) {
      log('Error recording metrics:', error instanceof Error ? error.message : String(error));
    }
  });

  next();
};

// Query metrics function
export const queryMetrics = async (metricName: string) => {
  try {
    const metrics = await register.getMetricsAsJSON();
    const now = Date.now() / 1000; // Convert to seconds for Prometheus compatibility

    // Find the requested metric
    const metric = metrics.find(m => m.name === metricName);
    if (!metric) {
      throw new Error(`Metric ${metricName} not found`);
    }

    // Format the response to match Prometheus API format
    return {
      status: 'success',
      data: {
        resultType: 'vector',
        result: metric.values.map((value: any) => ({
          metric: value.labels || {},
          value: [now, value.value.toString()]
        }))
      }
    };
  } catch (error) {
    log('Error querying metrics:', error instanceof Error ? error.message : String(error));
    throw error;
  }
};

// Get all metrics
export const getMetrics = async () => {
  try {
    const metrics = await register.metrics();
    return metrics;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('Failed to collect metrics:', errorMessage);
    throw new Error(`Failed to collect metrics: ${errorMessage}`);
  }
};

// Export registry for direct access if needed
export const prometheusRegistry = register;

// Database metrics tracking functions
export const trackDatabaseQuery = (queryType: string, table: string, duration: number) => {
  databaseQueryDurationHistogram
    .labels(queryType, table)
    .observe(duration / 1000);
};

export const updateDatabaseConnections = (count: number) => {
  activeConnectionsGauge.set(count);
};

// Error tracking function
export const trackError = (type: string) => {
  errorCounter.labels(type).inc();
};