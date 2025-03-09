import { logInfo, logError } from './logging';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { Request, Response, NextFunction } from 'express';
import fetch from 'node-fetch';

// Kibana configuration
const shouldUseKibana = process.env.ENABLE_KIBANA === 'true';
const KIBANA_URL = process.env.KIBANA_URL || 'http://localhost:5601';

// Initialize Kibana client
export async function checkKibanaHealth() {
  if (!shouldUseKibana) {
    logInfo('Kibana is disabled');
    return false;
  }

  try {
    const response = await fetch(`${KIBANA_URL}/api/status`, {
      headers: {
        'kbn-xsrf': 'true'
      }
    });

    if (!response.ok) {
      throw new Error(`Kibana returned status ${response.status}`);
    }

    const data = await response.json();
    logInfo('Kibana health check successful', { status: data.status });
    return true;
  } catch (error) {
    logError('Kibana health check failed:', {
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

// Middleware to handle Kibana authentication
export function kibanaAuthMiddleware(req: Request & { user?: any }, res: Response, next: NextFunction) {
  if (!shouldUseKibana) {
    return res.status(503).json({
      success: false,
      message: "Kibana service is not enabled"
    });
  }

  if (!req.user?.admin) {
    return res.status(403).json({
      success: false,
      message: "Admin access required"
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
      '^/admin/kibana': ''
    },
    onProxyReq: (proxyReq) => {
      proxyReq.setHeader('kbn-xsrf', 'true');
    },
    onError: (err, req, res) => {
      logError('Kibana proxy error:', {
        error: err.message
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
    logInfo('Kibana initialization skipped - not enabled');
    return false;
  }

  try {
    const isHealthy = await checkKibanaHealth();
    if (!isHealthy) {
      throw new Error('Health check failed');
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