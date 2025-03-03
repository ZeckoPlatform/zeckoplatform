import type { Express } from "express";
import { createServer, type Server } from "http";
import express from 'express';
import { log } from "./vite";
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';

// Verify JWT token
const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
  } catch (error) {
    log('Token verification failed:', error instanceof Error ? error.message : String(error));
    return null;
  }
};

export function registerRoutes(app: Express): Server {
  // Basic test endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
}