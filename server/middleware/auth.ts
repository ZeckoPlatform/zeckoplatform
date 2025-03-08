import { Request, Response, NextFunction } from 'express';
import { logError } from '../services/logging';

/**
 * Middleware to check if user is authenticated
 */
export default function authenticateToken(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.isAuthenticated()) {
      logError('Authentication failed:', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      return res.status(401).json({ error: "Authentication required" });
    }
    next();
  } catch (error) {
    logError('Auth middleware error:', {
      error: error instanceof Error ? error.message : String(error),
      path: req.path,
      method: req.method,
      stack: error instanceof Error ? error.stack : undefined
    });
    return res.status(500).json({ error: "Internal server error during authentication" });
  }
}