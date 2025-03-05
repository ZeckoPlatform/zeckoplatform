import type { Express } from "express";
import { createServer, type Server } from "http";
import { createProxyMiddleware } from "http-proxy-middleware";
import { initializeMonitoring, metricsMiddleware, getMetrics, getMetricsAsJSON } from './services/monitoring';
import jwt from 'jsonwebtoken';
import { log } from "./vite";
import path from 'path';
import fs from 'fs';
import express from 'express';

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
import kibanaRoutes from './routes/kibana';

const JWT_SECRET = process.env.REPL_ID!;

// Verify JWT token
const verifyToken = (token: string) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    log('Token verified successfully:', decoded);
    return decoded;
  } catch (error) {
    log('Token verification failed:', error instanceof Error ? error.message : String(error));
    return null;
  }
};

export function registerRoutes(app: Express): Server {
  try {
    // Initialize monitoring
    initializeMonitoring();

    // Add metrics middleware
    app.use(metricsMiddleware);

    // Development proxy middleware to bypass host verification
    if (process.env.NODE_ENV !== 'production') {
      app.use('/', createProxyMiddleware({
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true, // Enable WebSocket proxy
        pathRewrite: {
          '^/': '/' // Keep the path as is
        },
        secure: false,
        onProxyReq: (proxyReq, req) => {
          // Add any necessary headers
          proxyReq.setHeader('X-Forwarded-Host', req.headers.host || '');
          proxyReq.setHeader('X-Forwarded-Proto', 'http');
        },
        onError: (err, req, res) => {
          console.error('Proxy error:', err);
          res.status(500).send('Proxy error');
        }
      }));
    }

    // Mount Kibana routes first to ensure proper path handling
    app.use('/admin/analytics/settings/kibana', kibanaRoutes);

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

    // Create HTTP server
    const httpServer = createServer(app);
    log('Created HTTP server instance');

    return httpServer;

  } catch (error) {
    log('Failed to initialize routes:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}