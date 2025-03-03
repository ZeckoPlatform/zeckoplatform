import promClient from 'prom-client';
import { log } from '../vite';
import { logInfo, logError } from './logging';

// Initialize the Prometheus registry with more detailed configuration
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

// Register metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestsTotalCounter);
register.registerMetric(databaseQueryDurationHistogram);
register.registerMetric(activeUsersGauge);
register.registerMetric(systemMemoryGauge);
register.registerMetric(apiErrorsCounter);

// Initialize some sample data
function initializeSampleMetrics() {
  try {
    log('Initializing sample metrics...');

    // Add some sample HTTP requests
    httpRequestsTotalCounter.labels('GET', '/api/user', '200').inc(5);
    httpRequestsTotalCounter.labels('POST', '/api/login', '200').inc(2);
    httpRequestsTotalCounter.labels('GET', '/api/metrics', '200').inc(1);

    // Add some sample response times
    httpRequestDurationMicroseconds.labels('GET', '/api/user', '200').observe(0.2);
    httpRequestDurationMicroseconds.labels('POST', '/api/login', '200').observe(0.3);
    httpRequestDurationMicroseconds.labels('GET', '/api/metrics', '200').observe(0.1);

    // Add some sample database queries
    databaseQueryDurationHistogram.labels('SELECT', 'users').observe(0.1);
    databaseQueryDurationHistogram.labels('INSERT', 'users').observe(0.2);

    // Set initial active users
    activeUsersGauge.set(10);

    // Track initial system memory
    const used = process.memoryUsage();
    Object.entries(used).forEach(([key, value]) => {
      systemMemoryGauge.labels(key).set(value);
      log(`Setting initial memory metric for ${key}: ${value} bytes`);
    });

    log('Sample metrics initialized successfully');
  } catch (error) {
    log('Error initializing sample metrics:', error instanceof Error ? error.message : String(error));
  }
}

// Middleware to track HTTP requests
export const metricsMiddleware = (req: any, res: any, next: any) => {
  const start = Date.now();

  res.on('finish', () => {
    try {
      const duration = Date.now() - start;
      const route = req.route?.path || req.path;

      // Record metrics
      httpRequestDurationMicroseconds
        .labels(req.method, route, res.statusCode.toString())
        .observe(duration / 1000);

      httpRequestsTotalCounter
        .labels(req.method, route, res.statusCode.toString())
        .inc();

      // Track errors
      if (res.statusCode >= 400) {
        apiErrorsCounter
          .labels(route, res.statusCode >= 500 ? 'server' : 'client')
          .inc();
      }

      log('Recorded metrics for request:', {
        method: req.method,
        route,
        status: res.statusCode,
        duration: `${duration}ms`
      });
    } catch (error) {
      log('Error recording metrics:', error instanceof Error ? error.message : String(error));
    }
  });

  next();
};

// Get metrics endpoint handler
export const getMetrics = async () => {
  try {
    log('Collecting metrics...');

    // Force an update of system metrics
    const used = process.memoryUsage();
    Object.entries(used).forEach(([key, value]) => {
      systemMemoryGauge.labels(key).set(value);
      log(`Updated memory metric for ${key}: ${value} bytes`);
    });

    // Get all metrics
    const metrics = await register.metrics();

    if (!metrics) {
      throw new Error('No metrics available');
    }

    log('Metrics collected successfully:', {
      metricsLength: metrics.length,
      sampleMetric: metrics.substring(0, 100) + '...'
    });

    return metrics;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('Failed to collect metrics:', errorMessage);
    throw new Error(`Failed to collect metrics: ${errorMessage}`);
  }
};

let isInitialized = false;

// Initialize monitoring
export const initializeMonitoring = () => {
  if (isInitialized) {
    log('Monitoring already initialized, skipping...');
    return;
  }

  try {
    log('Initializing Prometheus monitoring...');

    // Start collecting default metrics
    promClient.collectDefaultMetrics({
      register,
      prefix: 'zecko_',
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
    });

    // Initialize sample metrics
    initializeSampleMetrics();

    isInitialized = true;
    log('Prometheus monitoring initialized successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('Failed to initialize monitoring:', errorMessage);
    throw error;
  }
};

// Export the registry for direct access if needed
export const prometheusRegistry = register;

export const trackDatabaseQuery = (queryType: string, table: string, duration: number) => {
  databaseQueryDurationHistogram
    .labels(queryType, table)
    .observe(duration / 1000);

  logInfo('Database Query Metric', {
    type: queryType,
    table: table,
    duration: duration
  });
};

export const updateActiveUsers = (count: number) => {
  activeUsersGauge.set(count);
  logInfo('Active Users Updated', { count });
};

export const trackSystemMemory = () => {
  const used = process.memoryUsage();
  Object.entries(used).forEach(([key, value]) => {
    systemMemoryGauge.labels(key).set(value);
  });

  logInfo('System Memory Updated', {
    ...used,
    timestamp: new Date().toISOString()
  });
};