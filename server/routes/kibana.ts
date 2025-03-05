import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { authenticateToken, checkSuperAdminAccess } from "../auth";

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
      "^/admin/analytics/settings/kibana": "",
    },
    onProxyReq: (proxyReq, req, res) => {
      // Add any necessary headers or authentication
      proxyReq.setHeader("kbn-xsrf", "true");
    },
    onError: (err, req, res) => {
      console.error("Kibana proxy error:", err);
      res.status(503).send("Kibana service unavailable");
    },
  })
);

export default router;
