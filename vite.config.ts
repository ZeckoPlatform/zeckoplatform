import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react(), runtimeErrorOverlay(), themePlugin()],
  resolve: {
    alias: {
      "@db": path.resolve(__dirname, "db"),
      "@": path.resolve(__dirname, "client", "src"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
  // ✅ Fix: Allow Replit Host to Prevent "Blocked Request" Issue
  server: {
    host: true, // Allow external access
    strictPort: false,
    cors: true,
    allowedHosts: [
      "localhost",
      "replit.app",
      ".replit.dev",
      ".repl.co",
      "e20cb7ed-14fe-40d3-8b0c-1d8b1601dba7-00-1qxa6jldbdcn6.riker.replit.dev"
    ]
  }
});
