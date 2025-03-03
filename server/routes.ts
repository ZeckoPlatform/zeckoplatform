import type { Express } from "express";
import { createServer, type Server } from "http";
import { createRequire } from 'module';
import { setupAuth } from "./auth";
import { log } from "./vite";
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { metricsMiddleware, getMetrics, initializeMonitoring } from './services/monitoring';
import { ensureGrafanaRunning, stopGrafana, GRAFANA_INTERNAL_URL } from './services/grafana';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);

// Simple token verification
const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
  } catch (error) {
    log('Token verification failed:', error instanceof Error ? error.message : String(error));
    return null;
  }
};

export function registerRoutes(app: Express): Server {
  try {
    log('Initializing application routes...');

    // Initialize monitoring only
    initializeMonitoring();

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

    // Grafana management endpoints
    app.post('/api/admin/grafana/:action', async (req: any, res) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = verifyToken(authHeader.split(' ')[1]);
        if (!decoded || !(decoded as any).superAdmin) {
          return res.status(403).json({ error: 'Access denied' });
        }

        const { action } = req.params;

        if (action === 'start') {
          const success = await ensureGrafanaRunning();
          if (success) {
            res.json({ message: 'Grafana server started' });
          } else {
            res.status(500).json({ error: 'Failed to start Grafana server' });
          }
        } else if (action === 'stop') {
          stopGrafana();
          res.json({ message: 'Grafana server stopped' });
        } else {
          res.status(400).json({ error: 'Invalid action' });
        }
      } catch (error) {
        log('Error managing Grafana:', error instanceof Error ? error.message : String(error));
        res.status(500).json({ error: 'Failed to manage Grafana server' });
      }
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

    // Grafana proxy with basic authentication
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
          // Add basic auth header
          const auth = Buffer.from(`admin:${process.env.GRAFANA_ADMIN_PASSWORD || 'admin'}`).toString('base64');
          proxyReq.setHeader('Authorization', `Basic ${auth}`);

          log('Grafana proxy request:', {
            url: req.url,
            method: req.method
          });
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

    log('Application routes initialized successfully');
    return createServer(app);
  } catch (error) {
    log('Failed to initialize application routes:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}