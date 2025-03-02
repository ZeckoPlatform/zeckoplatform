import prometheus from 'prom-client';
import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

// Initialize Prometheus metrics
const collectDefaultMetrics = prometheus.collectDefaultMetrics;
const Registry = prometheus.Registry;
const register = new Registry();
collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDurationMicroseconds = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const activeUsersGauge = new prometheus.Gauge({
  name: 'zecko_active_users',
  help: 'Number of active users'
});

const totalRequestsCounter = new prometheus.Counter({
  name: 'zecko_total_requests',
  help: 'Total number of requests made'
});

register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(activeUsersGauge);
register.registerMetric(totalRequestsCounter);

// Initialize Winston logger with Elasticsearch transport
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    }),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

// Add Elasticsearch transport if configured
if (process.env.ELASTICSEARCH_URL) {
  logger.add(new ElasticsearchTransport({
    level: 'info',
    clientOpts: { node: process.env.ELASTICSEARCH_URL },
    indexPrefix: 'zecko-logs'
  }));
}

export const monitoring = {
  register,
  metrics: {
    httpRequestDurationMicroseconds,
    activeUsersGauge,
    totalRequestsCounter
  },
  logger
};

// Middleware to track request duration
export const requestDurationMiddleware = (req: any, res: any, next: any) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    httpRequestDurationMicroseconds
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .observe(duration / 1000); // Convert to seconds
    
    totalRequestsCounter.inc();
    
    // Log request details
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('user-agent')
    });
  });
  next();
};
