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

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
}

export function registerRoutes(app: Express): Server {
  // Initialize monitoring
  initializeMonitoring();

  // Start Grafana server
  startGrafanaServer();

  // JSON and urlencoded middleware should come first
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Setup authentication - this needs to come before other middleware
  setupAuth(app);

  // Add metrics middleware
  app.use(metricsMiddleware);

  // Set default headers for all API routes
  app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // Metrics endpoint (protected for admin access only)
  app.get('/api/metrics', async (req: any, res) => {
    try {
      // Only allow access from admin users
      if (!req.user?.superAdmin) {
        log('Metrics access denied:', { user: req.user });
        return res.status(403).json({ error: 'Access denied' });
      }
      const metrics = await getMetrics();
      res.set('Content-Type', 'text/plain');
      res.send(metrics);
    } catch (error) {
      log('Error serving metrics:', error instanceof Error ? error.message : String(error));
      res.status(500).send('Error collecting metrics');
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static(uploadDir));

  // Grafana proxy middleware (protected for admin access only)
  app.use(
    '/admin/analytics/grafana',
    (req: any, res, next) => {
      // Debug log for authentication
      log('Grafana auth check:', {
        isAuthenticated: req.isAuthenticated(),
        user: req.user,
        isSuperAdmin: req.user?.superAdmin,
        headers: req.headers
      });

      if (!req.isAuthenticated()) {
        log('Grafana access denied: Not authenticated');
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!req.user?.superAdmin) {
        log('Grafana access denied: Not super admin');
        return res.status(403).json({ error: 'Super admin access required' });
      }

      // Add auth headers for Grafana
      req.headers['X-WEBAUTH-USER'] = req.user.email;
      req.headers['X-WEBAUTH-NAME'] = req.user.username || req.user.email;
      req.headers['X-WEBAUTH-ROLE'] = 'Admin';

      next();
    },
    createProxyMiddleware({
      target: GRAFANA_INTERNAL_URL,
      changeOrigin: true,
      pathRewrite: {
        '^/admin/analytics/grafana': '',
      },
      ws: true,
      onProxyReq: (proxyReq, req: any, res) => {
        log('Grafana proxy request:', {
          originalUrl: req.originalUrl,
          headers: proxyReq.getHeaders()
        });
      },
      onError: (err: Error, req: any, res) => {
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

  // Error handling middleware - should be last
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