import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { database as db } from "@db";
import { sql } from "drizzle-orm";
import { log } from "./vite";
import express from 'express';

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

  // Health check endpoint to verify database connectivity
  app.get('/api/healthcheck', async (req, res) => {
    try {
      const result = await db.execute(sql`SELECT 1 as health_check`);
      log('Database health check successful');
      res.json({ 
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      log('Database health check failed:', error instanceof Error ? error.message : String(error));
      res.status(500).json({ 
        status: 'unhealthy',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  setupAuth(app);

  // Register all route modules
  app.use('/api', require('./routes/auth'));
  app.use('/api', require('./routes/upload'));
  app.use('/api', require('./routes/subscriptions'));
  app.use('/api', require('./routes/invoices'));
  app.use('/api', require('./routes/analytics'));
  app.use('/api', require('./routes/notifications'));
  app.use('/api', require('./routes/admin'));
  app.use('/api', require('./routes/documents'));
  app.use('/api', require('./routes/reviews'));
  app.use('/api', require('./routes/orders'));
  app.use('/api', require('./routes/social'));
  app.use('/api', require('./routes/leads'));
  app.use('/api', require('./routes/comments'));

  // Error handling middleware - should be last
  app.use((err: any, req: any, res: any, next: any) => {
    log('Global error handler:', err);
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