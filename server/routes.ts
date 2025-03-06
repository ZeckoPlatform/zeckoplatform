import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from 'ws';
import { initializeMonitoring, metricsMiddleware } from './services/monitoring';
import jwt from 'jsonwebtoken';
import { log } from "./vite";
import express from "express";
import { registerWebSocket } from "./services/notifications";
import authRoutes from './routes/auth';
import uploadRoutes from './routes/upload';
import subscriptionRoutes from './routes/subscription';
import invoiceRoutes from './routes/invoice';
import analyticsRoutes from './routes/analytics';
import notificationRoutes from './routes/notifications';
import adminRoutes from './routes/admin';
import documentRoutes from './routes/document';
import reviewRoutes from './routes/review';
import orderRoutes from './routes/order';
import socialRoutes from './routes/social';
import leadsRoutes from './routes/leads';
import commentsRoutes from './routes/comments';
import feedbackRoutes from './routes/feedback';
import kibanaRouter from './routes/kibana';

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

    // Create HTTP server
    const httpServer = createServer(app);

    // Create WebSocket server for real-time notifications
    const wss = new WebSocketServer({ 
      server: httpServer,
      path: '/ws/notifications'
    });

    // Store WebSocket server globally for notifications
    global.wss = wss;

    wss.on('connection', (ws, req) => {
      log('New WebSocket connection');

      const token = req.url?.split('token=')[1];
      if (!token) {
        ws.close(1008, 'Authentication required');
        return;
      }

      const decoded = verifyToken(token);
      if (!decoded || !decoded.sub) {
        ws.close(1008, 'Invalid token');
        return;
      }

      // Register WebSocket connection for notifications
      registerWebSocket(Number(decoded.sub), ws);
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
    app.use('/api', feedbackRoutes);

    // Mount Kibana proxy route
    app.use('/admin/analytics/kibana', kibanaRouter);

    return httpServer;
  } catch (error) {
    log('Failed to initialize routes:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}