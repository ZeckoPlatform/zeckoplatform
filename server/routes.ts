import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { setupAuth, authenticateToken } from "./auth";
import { db } from "@db";
import { leads, users, subscriptions, products, leadResponses, messages } from "@db/schema";
import { eq, and, or, gt, not, sql, desc } from "drizzle-orm";
import { log } from "./vite";
import { comparePasswords, hashPassword } from './auth';
import fs from 'fs';
import express from 'express';
import { createConnectedAccount, retrieveConnectedAccount } from './stripe';
import { sendEmail } from './services/email';
import subscriptionRoutes from './routes/subscriptions';
import invoiceRoutes from './routes/invoices';
import { insertUserSchema } from "@db/schema";
import { fromZodError } from 'zod-validation-error';
import authRoutes from './routes/auth';
import analyticsRoutes from './routes/analytics';
import notificationRoutes from './routes/notifications';
import adminRoutes from './routes/admin';
import documentRoutes from './routes/documents';
import reviewRoutes from './routes/reviews';
import orderRoutes from './routes/orders';
import { cleanupExpiredLeads } from './services/cleanup';
import feedbackRoutes from './routes/feedback';

interface User {
  id: number;
  email: string;
  userType: string;
  subscriptionActive: boolean;
  stripeAccountId?: string;
  stripeAccountStatus?: string;
  profile?: any;
  countryCode?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
      login: any;
      isAuthenticated(): boolean;
      sessionID: string;
    }
  }
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

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

  // Register all other route modules
  app.use('/api', authRoutes);
  app.use('/api', subscriptionRoutes);
  app.use('/api', invoiceRoutes);
  app.use('/api', analyticsRoutes);
  app.use('/api', notificationRoutes);
  app.use('/api', adminRoutes);
  app.use('/api', documentRoutes);
  app.use('/api', reviewRoutes);
  app.use('/api', orderRoutes);

  const httpServer = createServer(app);
  return httpServer;
}