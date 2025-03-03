import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { log } from "./vite";
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { metricsMiddleware, getMetrics, initializeMonitoring } from './services/monitoring';
import { startGrafanaServer, GRAFANA_INTERNAL_URL } from './services/grafana';
import jwt from 'jsonwebtoken';

// Verify JWT token with detailed logging
const verifyToken = (token: string) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    log('Token verification succeeded:', {
      isSuperAdmin: (decoded as any)?.superAdmin,
      email: (decoded as any)?.email
    });
    return decoded;
  } catch (error) {
    log('Token verification failed:', error instanceof Error ? error.message : String(error));
    return null;
  }
};

export function registerRoutes(app: Express): Server {
  // Initialize monitoring and Grafana
  initializeMonitoring();
  startGrafanaServer();

  // Middleware setup
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  setupAuth(app);
  app.use(metricsMiddleware);

  // Set default headers for API routes
  app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // Metrics endpoint with JWT auth
  app.get('/api/metrics', async (req: any, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);

      if (!decoded || !(decoded as any).superAdmin) {
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

  // Grafana proxy middleware with simplified auth
  app.use(
    '/admin/analytics/grafana',
    (req: any, res, next) => {
      // For debugging: Log incoming request details
      log('Incoming Grafana request:', {
        url: req.url,
        method: req.method,
        headers: {
          ...req.headers,
          authorization: req.headers.authorization ? '[PRESENT]' : '[ABSENT]'
        }
      });

      // With anonymous access enabled, we'll still verify the JWT but not block access
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        if (decoded && (decoded as any).superAdmin) {
          // If authenticated as admin, set up basic auth
          const email = (decoded as any).email || 'zeckoinfo@gmail.com';
          const grafanaAuth = Buffer.from(`${email}:${process.env.GRAFANA_ADMIN_PASSWORD || 'Bobo19881'}`).toString('base64');
          req.headers['Authorization'] = `Basic ${grafanaAuth}`;
        }
      }

      next();
    },
    createProxyMiddleware({
      target: GRAFANA_INTERNAL_URL,
      changeOrigin: true,
      pathRewrite: {
        '^/admin/analytics/grafana': '',
      },
      ws: true,
      onProxyReq: (proxyReq, req: any) => {
        // Log proxy request details
        log('Grafana proxy request:', {
          url: req.url,
          method: req.method,
          proxyHeaders: proxyReq.getHeaders()
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

// Import route handlers
import path from 'path';
import fs from 'fs';
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
}

// Import routes
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const subscriptionRoutes = require('./routes/subscription');
const invoiceRoutes = require('./routes/invoice');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notification');
const adminRoutes = require('./routes/admin');
const documentRoutes = require('./routes/document');
const reviewRoutes = require('./routes/review');
const orderRoutes = require('./routes/order');
const socialRoutes = require('./routes/social');
const leadsRoutes = require('./routes/leads');
const commentsRoutes = require('./routes/comments');
const feedbackRoutes = require('./routes/feedback');