import { spawn } from 'child_process';
import { log } from '../vite';
import path from 'path';
import fs from 'fs';

const GRAFANA_PORT = 3001;
const GRAFANA_CONFIG_DIR = path.resolve(process.cwd(), 'grafana');
const GRAFANA_DATA_DIR = path.join(GRAFANA_CONFIG_DIR, 'data');
const GRAFANA_CONFIG_FILE = path.join(GRAFANA_CONFIG_DIR, 'grafana.ini');

// Ensure Grafana config directory exists
if (!fs.existsSync(GRAFANA_CONFIG_DIR)) {
  fs.mkdirSync(GRAFANA_CONFIG_DIR, { recursive: true });
}

// Basic configuration using environment variables
const grafanaConfig = `
[paths]
data = ${GRAFANA_DATA_DIR}

[server]
protocol = http
http_port = ${GRAFANA_PORT}
domain = localhost
http_addr = 0.0.0.0

[security]
admin_user = admin
admin_password = ${process.env.GRAFANA_ADMIN_PASSWORD || 'admin'}
allow_embedding = true
cookie_secure = false
cookie_samesite = none

[auth.anonymous]
enabled = true
org_name = Main Org.
org_role = Viewer

[log]
mode = console
level = info
`;

let grafanaProcess: any = null;
let isStarting = false;

export async function ensureGrafanaRunning(): Promise<boolean> {
  if (grafanaProcess) {
    return true;
  }

  if (isStarting) {
    return false;
  }

  try {
    isStarting = true;
    log('Starting Grafana server...');

    // Write current config
    fs.writeFileSync(GRAFANA_CONFIG_FILE, grafanaConfig);

    // Start Grafana
    const grafanaServerPath = '/nix/store/2m2kacwqa9v8wd09c1p4pp2cx99bviww-grafana-10.4.3/bin/grafana-server';

    grafanaProcess = spawn(grafanaServerPath, [
      '--config', GRAFANA_CONFIG_FILE,
      '--homepath', '/nix/store/2m2kacwqa9v8wd09c1p4pp2cx99bviww-grafana-10.4.3/share/grafana',
    ]);

    // Handle process events
    grafanaProcess.stdout.on('data', (data: Buffer) => {
      log('Grafana:', data.toString());
    });

    grafanaProcess.stderr.on('data', (data: Buffer) => {
      log('Grafana Error:', data.toString());
    });

    grafanaProcess.on('close', (code: number) => {
      log(`Grafana process exited with code ${code}`);
      grafanaProcess = null;
      isStarting = false;
    });

    // Wait for Grafana to be ready
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`http://localhost:${GRAFANA_PORT}/api/health`);
        if (response.ok) {
          log('Grafana server is ready');
          isStarting = false;
          return true;
        }
      } catch (error) {
        // Ignore connection errors during startup
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new Error('Grafana failed to start within timeout period');

  } catch (error) {
    log('Failed to start Grafana:', error instanceof Error ? error.message : String(error));
    isStarting = false;
    return false;
  }
}

export function stopGrafana() {
  if (grafanaProcess) {
    grafanaProcess.kill();
    grafanaProcess = null;
    log('Grafana server stopped');
  }
}

// Export Grafana URL
export const GRAFANA_INTERNAL_URL = `http://localhost:${GRAFANA_PORT}`;