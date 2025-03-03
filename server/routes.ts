import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { log } from "./vite";
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { metricsMiddleware, getMetrics, initializeMonitoring } from './services/monitoring';
import { startGrafanaServer, GRAFANA_INTERNAL_URL } from './services/grafana';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';

// Simple token verification
const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
  } catch (error) {
    return null;
  }
};

export function registerRoutes(app: Express): Server {
  // Initialize services
  initializeMonitoring();
  startGrafanaServer();

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  setupAuth(app);
  app.use(metricsMiddleware);

  // API routes header setup
  app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // Metrics endpoint
  app.get('/api/metrics', async (req: any, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const decoded = verifyToken(authHeader.split(' ')[1]);
      if (!decoded || !(decoded as any).superAdmin) {
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

  // Simple Grafana proxy
  app.use(
    '/admin/analytics/grafana',
    createProxyMiddleware({
      target: GRAFANA_INTERNAL_URL,
      changeOrigin: true,
      pathRewrite: {
        '^/admin/analytics/grafana': '',
      },
      ws: true,
      onProxyReq: (proxyReq, req: any) => {
        log('Grafana proxy request:', {
          url: req.url,
          method: req.method
        });
      },
      onError: (err: Error) => {
        log('Grafana proxy error:', err instanceof Error ? err.message : String(err));
      }
    })
  );

  // Register API routes
  app.use('/api', require('./routes/auth'));
  app.use('/api', require('./routes/upload'));
  app.use('/api', require('./routes/subscription'));
  app.use('/api', require('./routes/invoice'));
  app.use('/api', require('./routes/analytics'));
  app.use('/api', require('./routes/notification'));
  app.use('/api', require('./routes/admin'));
  app.use('/api', require('./routes/document'));
  app.use('/api', require('./routes/review'));
  app.use('/api', require('./routes/order'));
  app.use('/api', require('./routes/social'));
  app.use('/api', require('./routes/leads'));
  app.use('/api', require('./routes/comments'));
  app.use('/api', require('./routes/feedback'));

  // Static file serving
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
  }
  app.use('/uploads', express.static(uploadDir));

  return createServer(app);
}