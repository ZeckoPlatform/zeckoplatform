import { logInfo } from './logging';
import { Request, Response, NextFunction } from 'express';

// Always return false for Kibana usage
const shouldUseKibana = false;

export async function checkKibanaHealth() {
  logInfo('Kibana health check skipped - service is disabled');
  return false;
}

export function kibanaAuthMiddleware(req: Request & { user?: any }, res: Response, next: NextFunction) {
  next();
}

export function createKibanaProxy() {
  return (req: Request, res: Response) => {
    res.status(503).json({
      success: false,
      message: "Kibana service is not enabled in this environment"
    });
  };
}

export async function initializeKibana() {
  logInfo('Kibana initialization skipped - service is disabled');
  return false;
}