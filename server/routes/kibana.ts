import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { authenticateToken, checkSuperAdminAccess } from "../auth";
import { logInfo, logError } from "../services/logging";

const router = Router();

// Protect Kibana access with authentication
router.use(authenticateToken, checkSuperAdminAccess);

// Proxy Kibana requests
router.use(
  "/",
  createProxyMiddleware({
    target: "http://localhost:5601",
    changeOrigin: true,
    pathRewrite: {
      "^/admin/analytics/kibana": "",
    },
    onProxyReq: (proxyReq) => {
      // Add Kibana authentication headers
      proxyReq.setHeader('kbn-xsrf', 'true');
      if (process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD) {
        proxyReq.setHeader(
          'Authorization',
          'Basic ' + Buffer.from(
            `${process.env.ELASTICSEARCH_USERNAME}:${process.env.ELASTICSEARCH_PASSWORD}`
          ).toString('base64')
        );
      }
    },
    onError: (err, req, res) => {
      logError('Kibana proxy error:', { error: err instanceof Error ? err.message : String(err) });
      res.status(503).send("Kibana service unavailable");
    },
  })
);

export default router;