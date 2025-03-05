import { Router } from "express";
import { authenticateToken } from "../auth";
import { logInfo, logError } from "../services/logging";
import { 
  kibanaAuthMiddleware, 
  createKibanaProxy,
  initializeKibana 
} from "../services/kibana";

const router = Router();

// Initialize Kibana when the router is created
initializeKibana().catch(error => {
  logError('Failed to initialize Kibana router:', {
    error: error instanceof Error ? error.message : String(error)
  });
});

// Protect Kibana access with authentication and admin check
router.use('/', authenticateToken, async (req, res, next) => {
  logInfo('Received Kibana request:', {
    path: req.path,
    method: req.method,
    user: req.user?.email
  });
  next();
}, kibanaAuthMiddleware, createKibanaProxy());

export default router;