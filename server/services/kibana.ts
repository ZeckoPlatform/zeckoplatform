import { logInfo, logError } from './logging';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { Request, Response, NextFunction } from 'express';

// Initialize Kibana client
export async function checkKibanaHealth() {
  try {
    logInfo('Attempting Kibana health check...', {
      metadata: {
        kibanaUrl: 'http://localhost:5601/api/status',
      }
    });

    const auth = Buffer.from('zeckoinfo@gmail.com:Bobo19881').toString('base64');
    const response = await fetch('http://localhost:5601/api/status', {
      headers: {
        'Authorization': `Basic ${auth}`,
        'kbn-xsrf': 'true'
      }
    });

    if (!response.ok) {
      const responseText = await response.text();
      logError('Kibana health check failed:', {
        status: response.status,
        statusText: response.statusText,
        responseBody: responseText
      });
      throw new Error(`Kibana health check failed: ${response.statusText}`);
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
export function kibanaAuthMiddleware(req: Request, res: Response, next: NextFunction) {
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
  return createProxyMiddleware({
    target: 'http://localhost:5601',
    changeOrigin: true,
    pathRewrite: {
      '^/admin/analytics/kibana': ''
    },
    onProxyReq: (proxyReq) => {
      // Add required headers for Kibana
      proxyReq.setHeader('kbn-xsrf', 'true');
      const auth = Buffer.from('zeckoinfo@gmail.com:Bobo19881').toString('base64');
      proxyReq.setHeader('Authorization', `Basic ${auth}`);

      logInfo('Proxying request to Kibana', {
        path: proxyReq.path,
        headers: {
          'kbn-xsrf': proxyReq.getHeader('kbn-xsrf'),
          'Authorization': 'Basic **********' // Masked for security
        }
      });
    },
    onProxyRes: (proxyRes, req, res) => {
      // Log proxy response status
      logInfo('Kibana proxy response', {
        status: proxyRes.statusCode,
        path: req.path
      });
    },
    onError: (err, req, res) => {
      logError('Kibana proxy error:', {
        error: err instanceof Error ? err.message : String(err),
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