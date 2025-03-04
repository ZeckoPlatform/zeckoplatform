import { log } from '../vite';

export const GRAFANA_PORT = 3001;
export const GRAFANA_INTERNAL_URL = `http://localhost:${GRAFANA_PORT}`;

// No need to manage Grafana process anymore since we're using system service
export function startGrafanaServer(): Promise<void> {
  return new Promise((resolve) => {
    try {
      log('Starting Grafana server setup...');
      resolve();
    } catch (error) {
      log('Failed to start Grafana:', error instanceof Error ? error.message : String(error));
      resolve(); // Changed reject to resolve to match edited code's structure.  Error handling is minimal here.
    }
  });
}

export function stopGrafanaServer() {
  // No-op since we're not managing the process
}

process.on('SIGINT', () => {
  stopGrafanaServer();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopGrafanaServer();
  process.exit(0);
});