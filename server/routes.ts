import type { Express } from "express";
import { createServer, type Server } from "http";
import { createProxyMiddleware } from 'http-proxy-middleware';
import { metricsMiddleware, getMetrics, initializeMonitoring } from './services/monitoring';
import { startGrafanaServer, GRAFANA_INTERNAL_URL } from './services/grafana';
import jwt from 'jsonwebtoken';
import { log } from "./vite";

// Verify JWT token with detailed logging
const verifyToken = (token: string) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    log('Token verification:', {
      isValid: !!decoded,
      isSuperAdmin: decoded?.superAdmin,
      decodedToken: decoded
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

  // Temporarily disable Grafana server start for debugging
  // startGrafanaServer();

  // Add metrics middleware
  app.use(metricsMiddleware);

  // Metrics endpoint with JWT auth
  app.get('/api/metrics', async (req: any, res) => {
    try {
      const authHeader = req.headers.authorization;
      log('Metrics request:', { hasAuth: !!authHeader });

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
      log('Error serving metrics:', error instanceof Error ? error.message : String(error));
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  });

  // Single authentication middleware for Grafana
  app.use('/admin/analytics/grafana', (req: any, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      log('Grafana request headers:', {
        auth: authHeader ? authHeader.substring(0, 20) + '...' : 'none',
        path: req.path,
        method: req.method
      });

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        log('Grafana auth failed: No Bearer token');
        return res.status(401).json({ error: 'Authentication required' });
      }

      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);

      if (!decoded || !decoded.superAdmin) {
        log('Grafana auth failed: Not super admin', { decoded });
        return res.status(403).json({ error: 'Access denied' });
      }

      // Set Basic Auth header for Grafana
      const grafanaAuth = Buffer.from(`admin:${process.env.GRAFANA_ADMIN_PASSWORD || 'admin'}`).toString('base64');
      req.headers.authorization = `Basic ${grafanaAuth}`;

      log('Grafana auth success:', {
        path: req.path,
        basicAuthSet: true
      });

      next();
    } catch (error) {
      log('Grafana auth error:', error instanceof Error ? error.message : String(error));
      res.status(500).json({ error: 'Authentication failed' });
    }
  });

  // Grafana proxy with detailed logging
  app.use('/admin/analytics/grafana', createProxyMiddleware({
    target: GRAFANA_INTERNAL_URL,
    changeOrigin: true,
    ws: true,
    pathRewrite: {
      '^/admin/analytics/grafana': ''
    },
    onProxyReq: (proxyReq, req: any) => {
      log('Grafana proxy request:', {
        originalPath: req.path,
        targetPath: proxyReq.path,
        method: req.method,
        hasAuth: !!req.headers.authorization
      });
    },
    onProxyRes: (proxyRes, req: any) => {
      log('Grafana proxy response:', {
        path: req.path,
        status: proxyRes.statusCode,
        headers: proxyRes.headers
      });
    },
    onError: (err: Error, req: any) => {
      log('Grafana proxy error:', {
        message: err.message,
        path: req.path,
        stack: err.stack
      });
    }
  }));

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}

// Ensure uploads directory exists
const path = require('path');
const fs = require('fs');
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
}

// Register API routes
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
const express = require('express'); // added express import

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