import promClient from 'prom-client';
import { log } from '../vite';
import { logInfo, logError } from './logging';

// Initialize the Prometheus registry
const register = new promClient.Registry();

// Custom metrics
const httpRequestDurationMicroseconds = new promClient.Histogram({
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

const databaseQueryDurationHistogram = new promClient.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type', 'table'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const activeUsersGauge = new promClient.Gauge({
  name: 'active_users_total',
  help: 'Total number of active users'
});

const systemMemoryGauge = new promClient.Gauge({
  name: 'system_memory_bytes',
  help: 'System memory usage in bytes',
  labelNames: ['type']
});

const apiErrorsCounter = new promClient.Counter({
  name: 'api_errors_total',
  help: 'Total number of API errors',
  labelNames: ['endpoint', 'error_type']
});

// Register custom metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestsTotalCounter);
register.registerMetric(databaseQueryDurationHistogram);
register.registerMetric(activeUsersGauge);
register.registerMetric(systemMemoryGauge);
register.registerMetric(apiErrorsCounter);

// Middleware to track HTTP requests
export const metricsMiddleware = (req: any, res: any, next: any) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const route = req.route?.path || req.path;

    // Record metrics
    httpRequestDurationMicroseconds
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration / 1000);

    httpRequestsTotalCounter
      .labels(req.method, route, res.statusCode.toString())
      .inc();

    // Log request details
    logInfo('API Request', {
      method: req.method,
      path: route,
      statusCode: res.statusCode,
      duration: duration
    });

    // Track errors
    if (res.statusCode >= 400) {
      apiErrorsCounter
        .labels(route, res.statusCode >= 500 ? 'server' : 'client')
        .inc();

      logError('API Error', {
        method: req.method,
        path: route,
        statusCode: res.statusCode,
        error: res.locals.error
      });
    }
  });

  next();
};

// Database query tracking
export const trackDatabaseQuery = (queryType: string, table: string, duration: number) => {
  databaseQueryDurationHistogram
    .labels(queryType, table)
    .observe(duration / 1000);

  logInfo('Database Query', {
    type: queryType,
    table: table,
    duration: duration
  });
};

// Active users tracking
export const updateActiveUsers = (count: number) => {
  activeUsersGauge.set(count);
};

// System memory tracking
export const trackSystemMemory = () => {
  const used = process.memoryUsage();

  // Convert bytes to megabytes for clearer metrics
  Object.entries(used).forEach(([key, value]) => {
    systemMemoryGauge.labels(key).set(value);
  });

  logInfo('System Memory', {
    ...used,
    timestamp: new Date().toISOString()
  });
};

// Initialize some sample data
function initializeSampleMetrics() {
  // Add some sample HTTP requests
  httpRequestsTotalCounter.labels('GET', '/api/user', '200').inc(5);
  httpRequestsTotalCounter.labels('POST', '/api/login', '200').inc(2);

  // Add some sample response times
  httpRequestDurationMicroseconds.labels('GET', '/api/user', '200').observe(0.2);
  httpRequestDurationMicroseconds.labels('POST', '/api/login', '200').observe(0.3);

  // Add some sample database queries
  databaseQueryDurationHistogram.labels('SELECT', 'users').observe(0.1);
  databaseQueryDurationHistogram.labels('INSERT', 'users').observe(0.2);
}

// Metrics endpoint handler
export const getMetrics = async () => {
  try {
    // Force an update of system metrics before returning
    trackSystemMemory();

    // Get all metrics
    const metrics = await register.metrics();

    logInfo('Metrics collected successfully', {
      timestamp: new Date().toISOString(),
      metricsLength: metrics.length
    });

    return metrics;
  } catch (error) {
    logError('Failed to collect metrics:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to collect metrics');
  }
};

let isInitialized = false;

// Initialize monitoring
export const initializeMonitoring = () => {
  if (isInitialized) {
    logInfo('Monitoring already initialized, skipping...');
    return;
  }

  try {
    logInfo('Initializing Prometheus monitoring...');

    // Reset all metrics
    register.clear();

    // Re-register our custom metrics
    register.registerMetric(httpRequestDurationMicroseconds);
    register.registerMetric(httpRequestsTotalCounter);
    register.registerMetric(databaseQueryDurationHistogram);
    register.registerMetric(activeUsersGauge);
    register.registerMetric(systemMemoryGauge);
    register.registerMetric(apiErrorsCounter);

    // Start collecting default metrics
    promClient.collectDefaultMetrics({
      register,
      prefix: 'zecko_'
    });

    // Start tracking system memory periodically
    setInterval(trackSystemMemory, 30000); // Every 30 seconds

    // Initialize with some baseline metrics
    trackSystemMemory();
    updateActiveUsers(0);
    initializeSampleMetrics();

    isInitialized = true;
    logInfo('Prometheus monitoring initialized successfully');
  } catch (error) {
    logError('Failed to initialize monitoring:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    // Don't throw the error, just log it
  }
};