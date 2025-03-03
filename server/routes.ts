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

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
}

// Verify JWT token
const verifyToken = (token: string) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    log('Token verification succeeded:', JSON.stringify({
      decoded,
      isSuperAdmin: decoded?.superAdmin
    }));
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

  // JSON and urlencoded middleware should come first
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

  // Metrics endpoint with JWT authentication
  app.get('/api/metrics', async (req: any, res) => {
    try {
      const authHeader = req.headers.authorization;
      log('Metrics request:', JSON.stringify({
        authHeader: authHeader ? 'Bearer [token]' : 'none',
        headers: req.headers
      }));

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);

      if (!decoded || !decoded.superAdmin) {
        log('Metrics access denied:', JSON.stringify({ decoded }));
        return res.status(403).json({ error: 'Access denied' });
      }

      const metrics = await getMetrics();
      if (!metrics) {
        return res.status(404).json({ error: 'No metrics available' });
      }

      res.set('Content-Type', 'text/plain');
      res.send(metrics);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('Error serving metrics:', errorMessage);
      res.status(500).json({ error: errorMessage });
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static(uploadDir));

  // Grafana proxy middleware with JWT auth
  app.use(
    '/admin/analytics/grafana',
    (req: any, res, next) => {
      let token;
      // Check for token in query params (for iframe) or Authorization header
      if (req.query.auth_token) {
        token = req.query.auth_token;
      } else if (req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
      }

      log('Grafana auth check:', JSON.stringify({
        hasQueryToken: !!req.query.auth_token,
        hasHeaderToken: !!req.headers.authorization,
        headers: req.headers
      }));

      if (!token) {
        log('Grafana access denied: No token found');
        return res.status(401).json({ error: 'Authentication required' });
      }

      const decoded = verifyToken(token);

      if (!decoded || !decoded.superAdmin) {
        log('Grafana access denied:', JSON.stringify({ decoded }));
        return res.status(403).json({ error: 'Access denied' });
      }

      // Set auth headers for Grafana proxy
      req.headers['x-webauth-user'] = decoded.email;
      req.headers['x-webauth-name'] = decoded.username || decoded.email;
      req.headers['x-webauth-role'] = 'Admin';
      req.headers['x-webauth-org'] = 'main';

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
        // Copy authentication headers to the proxied request
        proxyReq.setHeader('x-webauth-user', req.headers['x-webauth-user']);
        proxyReq.setHeader('x-webauth-name', req.headers['x-webauth-name']);
        proxyReq.setHeader('x-webauth-role', req.headers['x-webauth-role']);
        proxyReq.setHeader('x-webauth-org', req.headers['x-webauth-org']);

        log('Grafana proxy request:', JSON.stringify({
          originalUrl: req.originalUrl,
          headers: proxyReq.getHeaders()
        }));
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