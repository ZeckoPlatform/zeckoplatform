import { log } from '../vite';
import { spawn } from 'child_process';
import path from 'path';

export const GRAFANA_PORT = 3001;
export const GRAFANA_INTERNAL_URL = `http://localhost:${GRAFANA_PORT}`;

let grafanaProcess: any = null;

export function startGrafanaServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      if (grafanaProcess) {
        log('Grafana process already running');
        resolve();
        return;
      }

      log('Starting Grafana server setup...');

      const configPath = path.join(process.cwd(), 'grafana', 'grafana.ini');
      const homePath = '/home/runner/workspace/grafana';

      grafanaProcess = spawn('grafana', ['server', 
        '--config', configPath,
        '--homepath', homePath
      ], {
        detached: true,
        stdio: 'pipe'
      });

      // Log output
      grafanaProcess.stdout.on('data', (data: Buffer) => {
        log('Grafana stdout:', data.toString());
      });

      grafanaProcess.stderr.on('data', (data: Buffer) => {
        log('Grafana stderr:', data.toString());
      });

      grafanaProcess.on('error', (err: any) => {
        log('Failed to start Grafana:', err.message || String(err));
        reject(err);
      });

      // Wait a bit to ensure Grafana has started
      setTimeout(() => {
        log('Grafana server started');
        resolve();
      }, 5000);

    } catch (error) {
      log('Error starting Grafana:', error instanceof Error ? error.message : String(error));
      reject(error);
    }
  });
}

export function stopGrafanaServer() {
  if (grafanaProcess) {
    grafanaProcess.kill();
    grafanaProcess = null;
    log('Grafana server stopped');
  }
}

// Handle process termination
process.on('SIGINT', () => {
  stopGrafanaServer();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopGrafanaServer();
  process.exit(0);
});