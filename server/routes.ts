import type { Express } from "express";
import { createServer, type Server } from "http";
import { createProxyMiddleware } from 'http-proxy-middleware';
import { GRAFANA_INTERNAL_URL } from './services/grafana';
import jwt from 'jsonwebtoken';
import { log } from "./vite";
import express from 'express';
import path from 'path';
import fs from 'fs';

// Import routes using ES modules
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

// Verify JWT token
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
  try {
    // Initialize monitoring
    //initializeMonitoring(); //This line was removed because it's not in the edited code and seems unrelated to the primary change.

    // Add metrics middleware
    app.use(metricsMiddleware);

    // Grafana proxy middleware - Separate from main app auth
    app.use('/admin/analytics/grafana', (req: any, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Set Grafana Basic Auth header
      const grafanaAuth = Buffer.from(`zeckoinfo@gmail.com:${process.env.GRAFANA_ADMIN_PASSWORD}`).toString('base64');
      req.headers.authorization = `Basic ${grafanaAuth}`;
      next();
    });

    // Grafana proxy
    app.use('/admin/analytics/grafana', createProxyMiddleware({
      target: GRAFANA_INTERNAL_URL,
      changeOrigin: true,
      ws: true,
      pathRewrite: {
        '^/admin/analytics/grafana': ''
      }
    }));

    // Ensure uploads directory exists
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

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