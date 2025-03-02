import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, authenticateToken } from "./auth";
import { db } from "@db";
import { log } from "./vite";
import express from 'express';
import path from 'path';
import fs from 'fs';
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
  // JSON and urlencoded middleware should come first
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Trust first proxy for rate limiting to work properly
  app.set('trust proxy', 1);

  // Set default headers for all API routes
  app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  setupAuth(app);

  // Serve uploaded files
  app.use('/uploads', express.static(uploadDir));

  // Register feedback routes before authentication middleware
  app.use(feedbackRoutes);

  // Authentication middleware for protected routes
  app.use('/api', (req, res, next) => {
    if (req.path.endsWith('/login') ||
        req.path.endsWith('/register') ||
        req.path.endsWith('/auth/verify') ||
        req.path.endsWith('/auth/reset-password') ||
        req.path.endsWith('/auth/reset-password/confirm') ||
        req.path.endsWith('/vendor/stripe/account') ||
        req.path.endsWith('/vendor/stripe/account/status') ||
        req.path.endsWith('/feedback') ||
        req.method === 'OPTIONS') {
      return next();
    }
    authenticateToken(req, res, next);
  });

  // Register all route modules
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

  // Error handling middleware - should be last
  app.use((err: any, req: any, res: any, next: any) => {
    log('Global error handler:', err);
    // If headers are not sent yet and it's an API route
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