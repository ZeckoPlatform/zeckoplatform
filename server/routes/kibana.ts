import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { authenticateToken } from "../auth";

const router = Router();

// Protect Kibana access with authentication and superadmin check
router.use((req, res, next) => {
  if (!req.user?.superAdmin) {
    return res.status(403).json({ error: 'Access denied. Superadmin privileges required.' });
  }
  next();
});

// Proxy Kibana requests
router.use(
  "/",
  createProxyMiddleware({
    target: "http://localhost:5601",
    changeOrigin: true,
    pathRewrite: {
      "^/admin/analytics/settings/kibana": "",
    },
    onProxyReq: (proxyReq) => {
      // Add any necessary headers or authentication
      proxyReq.setHeader("kbn-xsrf", "true");
      if (process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD) {
        const auth = Buffer.from(
          `${process.env.ELASTICSEARCH_USERNAME}:${process.env.ELASTICSEARCH_PASSWORD}`
        ).toString('base64');
        proxyReq.setHeader('Authorization', `Basic ${auth}`);
      }
    },
    onError: (err, req, res) => {
      console.error("Kibana proxy error:", err);
      res.status(503).send("Kibana service unavailable");
    },
  })
);

export default router;