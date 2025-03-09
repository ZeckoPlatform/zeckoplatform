import { logInfo, logError } from './logging';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { Request, Response, NextFunction } from 'express';

// Only enable Kibana in production unless explicitly configured
const shouldUseKibana = process.env.ENABLE_KIBANA === 'true' || process.env.NODE_ENV === 'production';
const KIBANA_URL = process.env.KIBANA_URL || 'http://localhost:5601';

// Initialize Kibana client
export async function checkKibanaHealth() {
  if (!shouldUseKibana) {
    logInfo('Kibana is disabled in development mode');
    return false;
  }

  try {
    logInfo('Attempting Kibana health check...', {
      metadata: {
        kibanaUrl: `${KIBANA_URL}/api/status`,
      }
    });

    const response = await fetch(`${KIBANA_URL}/api/status`, {
      headers: {
        'kbn-xsrf': 'true'
      }
    });

    if (!response.ok) {
      logError('Kibana health check failed:', {
        status: response.status,
        statusText: response.statusText
      });
      return false;
    }

    const data = await response.json();
    logInfo('Kibana health check successful', { status: data.status });
    return true;
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      logError('Kibana health check failed in production:', {
        error: error instanceof Error ? error.message : String(error)
      });
    } else {
      logInfo('Kibana not available in development mode - skipping');
    }
    return false;
  }
}

// Middleware to handle Kibana authentication
export function kibanaAuthMiddleware(req: Request & { user?: any }, res: Response, next: NextFunction) {
  if (!req.user?.superAdmin) {
    logError('Unauthorized access attempt to Kibana', {
      user: req.user?.email,
      path: req.path
    });
    return res.status(403).json({
      success: false,
      message: "Super admin access required"
    });
  }
  next();
}

// Create Kibana proxy middleware
export function createKibanaProxy() {
  if (!shouldUseKibana) {
    return (req: Request, res: Response) => {
      res.status(503).json({
        success: false,
        message: "Kibana service is not enabled in this environment"
      });
    };
  }

  return createProxyMiddleware({
    target: KIBANA_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/admin/analytics/kibana': ''
    },
    onProxyReq: (proxyReq: any) => {
      proxyReq.setHeader('kbn-xsrf', 'true');
    },
    onProxyRes: (proxyRes: any, req: Request, res: Response) => {
      logInfo('Kibana proxy response', {
        status: proxyRes.statusCode,
        path: req.path
      });
    },
    onError: (err: Error, req: Request, res: Response) => {
      logError('Kibana proxy error:', {
        error: err.message,
        path: req.path
      });
      res.status(503).json({
        success: false,
        message: "Kibana service unavailable"
      });
    }
  });
}

// Initialize Kibana integration
export async function initializeKibana() {
  if (!shouldUseKibana) {
    logInfo('Kibana initialization skipped - not enabled in this environment');
    return false;
  }

  try {
    const isHealthy = await checkKibanaHealth();
    if (!isHealthy) {
      logError('Failed to initialize Kibana - health check failed');
      return false;
    }

    logInfo('Kibana initialization successful');
    return true;
  } catch (error) {
    logError('Kibana initialization error:', {
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}