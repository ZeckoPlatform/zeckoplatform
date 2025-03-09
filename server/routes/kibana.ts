import { Router } from "express";
import { logInfo } from "../services/logging";

const router = Router();

// Simplified router that returns a service unavailable response
router.use('/', (req, res) => {
  logInfo('Kibana service request received (service disabled)', {
    path: req.path,
    method: req.method
  });

  res.status(503).json({
    success: false,
    message: "Analytics service is currently disabled"
  });
});

export default router;