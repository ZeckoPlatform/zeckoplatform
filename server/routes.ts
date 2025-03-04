import type { Express } from "express";
import { createServer, type Server } from "http";
import { createProxyMiddleware } from 'http-proxy-middleware';
import { GRAFANA_INTERNAL_URL } from './services/grafana';
import jwt from 'jsonwebtoken';
import { log } from "./vite";
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';

// Import routes
import authRoutes from './routes/auth';
import uploadRoutes from './routes/upload';
import subscriptionRoutes from './routes/subscription';
import invoiceRoutes from './routes/invoice';
import analyticsRoutes from './routes/analytics';
import notificationRoutes from './routes/notification';
import adminRoutes from './routes/admin';
import documentRoutes from './routes/document';
import reviewRoutes from './routes/review';
import orderRoutes from './routes/order';
import socialRoutes from './routes/social';
import leadsRoutes from './routes/leads';
import commentsRoutes from './routes/comments';
import feedbackRoutes from './routes/feedback';
import { metricsMiddleware } from './services/monitoring';

const JWT_SECRET = process.env.REPL_ID!;

// Verify JWT token
const verifyToken = (token: string) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    log('Token verification result:', {
      isValid: !!decoded,
      isSuperAdmin: (decoded as any)?.superAdmin,
      decodedToken: decoded
    });
    return decoded;
  } catch (error) {
    log('Token verification failed:', error instanceof Error ? error.message : String(error));
    return null;
  }
};

async function checkGrafanaConnection(): Promise<boolean> {
  try {
    const response = await fetch(GRAFANA_INTERNAL_URL);
    log('Grafana connection check:', {
      status: response.status,
      statusText: response.statusText
    });
    return response.status === 200;
  } catch (error) {
    log('Grafana connection check failed:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

export function registerRoutes(app: Express): Server {
  try {
    // Add metrics middleware
    app.use(metricsMiddleware);

    // Grafana proxy setup
    const grafanaBasicAuth = Buffer.from(`zeckoinfo@gmail.com:${process.env.GRAFANA_ADMIN_PASSWORD || 'Bobo19881'}`).toString('base64');

    // First middleware to check JWT auth for protected paths
    app.use('/admin/analytics/grafana', async (req: any, res, next) => {
      // Check Grafana connectivity first
      const isGrafanaAvailable = await checkGrafanaConnection();
      if (!isGrafanaAvailable) {
        log('Grafana service is not available');
        return res.status(503).json({ error: 'Grafana service is unavailable' });
      }

      // Allow public access to certain paths
      if (req.path.startsWith('/public/')) {
        return next();
      }

      // Get token from Authorization header or query parameter
      let token: string | undefined;
      const authHeader = req.headers.authorization;

      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      } else {
        token = req.query.token as string;
      }

      log('Token extraction:', {
        hasAuthHeader: !!authHeader,
        authHeaderType: authHeader?.split(' ')[0],
        hasQueryToken: !!req.query.token,
        token: token?.substring(0, 10) + '...' // Log first 10 chars for debugging
      });

      if (!token) {
        log('No token found in request');
        return res.status(401).json({ error: 'Authentication required' });
      }

      const decoded = verifyToken(token);

      if (!decoded || !(decoded as any).superAdmin) {
        log('User not authorized for Grafana access:', { decoded });
        return res.status(403).json({ error: 'Access denied' });
      }

      // Store the original token
      req.originalToken = token;

      // Set Grafana auth header for this request
      req.headers.authorization = `Basic ${grafanaBasicAuth}`;
      next();
    });

    // Grafana proxy
    app.use('/admin/analytics/grafana', createProxyMiddleware({
      target: GRAFANA_INTERNAL_URL,
      changeOrigin: true,
      ws: true,
      pathRewrite: {
        '^/admin/analytics/grafana': ''
      },
      onProxyReq: (proxyReq: any) => {
        // Ensure Grafana auth header is set
        proxyReq.setHeader('Authorization', `Basic ${grafanaBasicAuth}`);

        log('Proxy request headers:', {
          headers: proxyReq.getHeaders()
        });
      },
      onProxyRes: (proxyRes: any) => {
        // Add CORS headers for iframe support
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
        proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
        proxyRes.headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type';

        log('Grafana proxy response:', {
          statusCode: proxyRes.statusCode,
          headers: proxyRes.headers
        });
      },
      onError: (err: Error, req: any, res: any) => {
        log('Grafana proxy error:', {
          error: err.message,
          stack: err.stack,
          path: req.path
        });
        res.status(502).json({ error: 'Failed to connect to Grafana service' });
      }
    }));

    // Register API routes
    app.use('/api', authRoutes);
    app.use('/api', uploadRoutes);
    app.use('/api', subscriptionRoutes);
    app.use('/api', invoiceRoutes);
    app.use('/api', analyticsRoutes);
    app.use('/api', notificationRoutes);
    app.use('/api', adminRoutes);
    app.use('/api', documentRoutes);
    app.use('/api', reviewRoutes);
    app.use('/api', orderRoutes);
    app.use('/api', socialRoutes);
    app.use('/api', leadsRoutes);
    app.use('/api', commentsRoutes);
    app.use('/api', feedbackRoutes);

    // Ensure uploads directory exists
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Serve uploaded files
    app.use('/uploads', express.static(uploadDir));

    // Error handling middleware
    app.use((err: any, req: any, res: any, next: any) => {
      log('Global error handler:', err instanceof Error ? err.message : String(err));
      if (!res.headersSent && req.path.startsWith('/api')) {
        res.status(err.status || 500).json({
          success: false,
          error: err.message || 'An unexpected error occurred'
        });
      } else {
        next(err);
      }
    });

    // Create HTTP server
    const httpServer = createServer(app);
    log('Created HTTP server instance');

    return httpServer;

  } catch (error) {
    log('Failed to initialize routes:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}