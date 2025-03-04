import { log } from '../vite';
import { spawn } from 'child_process';
import path from 'path';
import fetch from 'node-fetch';

export const GRAFANA_PORT = 3001;
export const GRAFANA_INTERNAL_URL = `http://localhost:${GRAFANA_PORT}`;

let grafanaProcess: any = null;

async function checkGrafanaHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${GRAFANA_INTERNAL_URL}/api/health`);
    const data = await response.json();
    log('Grafana health check:', {
      status: response.status,
      response: data
    });
    return response.status === 200;
  } catch (error) {
    log('Grafana health check failed:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

export function startGrafanaServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      if (grafanaProcess) {
        log('Grafana process already running');
        checkGrafanaHealth().then(isHealthy => {
          if (isHealthy) {
            resolve();
          } else {
            reject(new Error('Grafana is running but not healthy'));
          }
        });
        return;
      }

      log('Starting Grafana server setup...');

      const configPath = path.join(process.cwd(), 'grafana', 'grafana.ini');
      const homePath = path.join(process.cwd(), 'grafana');

      // Set environment variables for Grafana
      const env = {
        ...process.env,
        GF_PATHS_DATA: path.join(homePath, 'data'),
        GF_PATHS_LOGS: path.join(homePath, 'logs'),
        GF_PATHS_PLUGINS: path.join(homePath, 'plugins'),
        GF_PATHS_PROVISIONING: path.join(homePath, 'provisioning'),
        GF_SECURITY_ADMIN_USER: 'zeckoinfo@gmail.com',
        GF_SECURITY_ADMIN_PASSWORD: 'Bobo19881',
        GF_SERVER_HTTP_PORT: GRAFANA_PORT.toString(),
        GF_SERVER_PROTOCOL: 'http',
        GF_SERVER_DOMAIN: 'localhost',
        GF_AUTH_DISABLE_LOGIN_FORM: 'false',
        GF_AUTH_BASIC_ENABLED: 'true',
        GF_USERS_ALLOW_SIGN_UP: 'false',
        GF_SECURITY_ALLOW_EMBEDDING: 'true',
        GF_SECURITY_COOKIE_SECURE: 'false',
        GF_SECURITY_COOKIE_SAMESITE: 'none'
      };

      grafanaProcess = spawn('grafana', ['server', 
        '--config', configPath,
        '--homepath', homePath
      ], {
        detached: true,
        stdio: 'pipe',
        env
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

      // Wait for Grafana to start and verify health
      const healthCheckInterval = setInterval(async () => {
        if (await checkGrafanaHealth()) {
          clearInterval(healthCheckInterval);
          log('Grafana server started and healthy');
          resolve();
        }
      }, 1000);

      // Set timeout for health check
      setTimeout(() => {
        clearInterval(healthCheckInterval);
        if (grafanaProcess) {
          log('Grafana failed to become healthy within timeout');
          reject(new Error('Grafana failed to start within timeout'));
        }
      }, 30000);

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