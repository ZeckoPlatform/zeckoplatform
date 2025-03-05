// Configure Vite host settings before anything else
process.env.DANGEROUSLY_DISABLE_HOST_CHECK = "true";
process.env.VITE_ALLOW_ORIGIN = "*";
process.env.VITE_DEV_SERVER_HOSTNAME = "0.0.0.0";
process.env.VITE_HMR_HOST = process.env.REPL_SLUG + "." + process.env.REPL_OWNER + ".repl.co";
process.env.VITE_HMR_PROTOCOL = "wss";
process.env.VITE_DEV_SERVER_ALLOWED_HOSTS = "e20cb7ed-14fe-40d3-8b0c-1d8b1601dba7-00-1qxa6jldbdcn6.riker.replit.dev";

// Import and run the main server
import "./index.js";