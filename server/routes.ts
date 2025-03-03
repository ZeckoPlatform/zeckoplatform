import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { log } from "./vite";
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { metricsMiddleware, getMetrics, initializeMonitoring } from './services/monitoring';
import { startGrafanaServer, GRAFANA_INTERNAL_URL } from './services/grafana';
import jwt from 'jsonwebtoken';

// Import route handlers
import subscriptionRoutes from './routes/subscriptions';
import invoiceRoutes from './routes/invoices';
import authRoutes from './routes/auth';
import analyticsRoutes from './routes/analytics';
import notificationRoutes from './routes/notifications';
import adminRoutes from './routes/admin';
import documentRoutes from './routes/documents';
import reviewRoutes from './routes/reviews';
import orderRoutes from './routes/orders';
import leadsRoutes from './routes/leads';
import feedbackRoutes from './routes/feedback';
import socialRoutes from './routes/social';
import uploadRoutes from './routes/upload';
import commentsRoutes from './routes/comments';

// Verify JWT token
const verifyToken = (token: string) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    log('Token verification succeeded:', {
      isSuperAdmin: decoded?.superAdmin,
      email: decoded?.email
    });
    return decoded;
  } catch (error) {
    log('Token verification failed:', error instanceof Error ? error.message : String(error));
    return null;
  }
};

export function registerRoutes(app: Express): Server {
  // Initialize monitoring
  initializeMonitoring();

  // Start Grafana server
  startGrafanaServer();

  // JSON and urlencoded middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Setup authentication
  setupAuth(app);

  // Add metrics middleware
  app.use(metricsMiddleware);

  // Set default headers for all API routes
  app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // Metrics endpoint with JWT auth
  app.get('/api/metrics', async (req: any, res) => {
    try {
      const authHeader = req.headers.authorization;
      log('Metrics request:', {
        authHeader: authHeader ? 'Bearer [token]' : 'none',
        headers: req.headers
      });

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);

      if (!decoded || !decoded.superAdmin) {
        log('Metrics access denied:', { decoded });
        return res.status(403).json({ error: 'Access denied' });
      }

      const metrics = await getMetrics();
      res.set('Content-Type', 'text/plain');
      res.send(metrics);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('Error serving metrics:', errorMessage);
      res.status(500).json({ error: errorMessage });
    }
  });

  // Grafana proxy middleware with auth
  app.use(
    '/admin/analytics/grafana',
    (req: any, res, next) => {
      let token;

      // Check for token in Authorization header
      if (req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
      }

      log('Grafana auth check:', {
        hasHeaderToken: !!req.headers.authorization,
        url: req.url,
        method: req.method,
        path: req.path
      });

      if (!token) {
        log('Grafana access denied: No token found');
        return res.status(401).json({ error: 'Authentication required' });
      }

      const decoded = verifyToken(token);

      if (!decoded || !decoded.superAdmin) {
        log('Grafana access denied:', { decoded });
        return res.status(403).json({ error: 'Access denied' });
      }

      // Set Basic Auth header for Grafana
      const grafanaAuth = Buffer.from(`zeckoinfo@gmail.com:${process.env.GRAFANA_ADMIN_PASSWORD || 'admin'}`).toString('base64');
      req.headers['Authorization'] = `Basic ${grafanaAuth}`;

      next();
    },
    createProxyMiddleware({
      target: GRAFANA_INTERNAL_URL,
      changeOrigin: true,
      pathRewrite: {
        '^/admin/analytics/grafana': '',
      },
      ws: true,
      onProxyReq: (proxyReq: any, req: any) => {
        // Copy the Basic Auth header to the proxied request
        if (req.headers['authorization']) {
          proxyReq.setHeader('Authorization', req.headers['authorization']);
        }

        log('Grafana proxy request:', {
          url: req.url,
          method: req.method,
          hasAuth: !!req.headers['authorization']
        });
      },
      onError: (err: Error, req: any, res: any) => {
        log('Grafana proxy error:', err instanceof Error ? err.message : String(err));
        res.status(503).json({ error: 'Grafana service unavailable' });
      }
    })
  );

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

  // Register feedback routes
  app.use(feedbackRoutes);

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

  const httpServer = createServer(app);
  return httpServer;
}

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
}