import type { Express } from "express";
import { createServer, type Server } from "http";
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

const JWT_SECRET = process.env.REPL_ID!;

// Verify JWT token
const verifyToken = (token: string) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    log('Token verification failed:', error instanceof Error ? error.message : String(error));
    return null;
  }
};

export function registerRoutes(app: Express): Server {
  try {
    // Add metrics middleware
    app.use(metricsMiddleware);

    // Expose metrics endpoint (protected)
    app.get('/api/metrics', async (req, res) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);

      if (!decoded || !(decoded as any).superAdmin) {
        return res.status(403).json({ error: 'Access denied' });
      }

      try {
        const metrics = await getMetrics();
        res.set('Content-Type', 'text/plain');
        res.send(metrics);
      } catch (error) {
        log('Error fetching metrics:', error instanceof Error ? error.message : String(error));
        res.status(500).json({ error: 'Failed to collect metrics' });
      }
    });

    // Expose metrics in JSON format (protected)
    app.get('/api/metrics/json', async (req, res) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);

      if (!decoded || !(decoded as any).superAdmin) {
        return res.status(403).json({ error: 'Access denied' });
      }

      try {
        const metrics = await getMetricsAsJSON();
        res.json(metrics);
      } catch (error) {
        log('Error fetching metrics JSON:', error instanceof Error ? error.message : String(error));
        res.status(500).json({ error: 'Failed to collect metrics' });
      }
    });

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