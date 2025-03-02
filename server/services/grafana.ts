import { spawn } from 'child_process';
import { log } from '../vite';
import path from 'path';
import fs from 'fs';

const GRAFANA_PORT = 3001; // Different from our main app port
const GRAFANA_CONFIG_DIR = path.join(process.cwd(), 'grafana');
const GRAFANA_CONFIG_FILE = path.join(GRAFANA_CONFIG_DIR, 'grafana.ini');

// Ensure Grafana config directory exists
if (!fs.existsSync(GRAFANA_CONFIG_DIR)) {
  fs.mkdirSync(GRAFANA_CONFIG_DIR, { recursive: true });
}

// Basic Grafana configuration
const grafanaConfig = `
[server]
http_port = ${GRAFANA_PORT}
domain = localhost
root_url = %(protocol)s://%(domain)s/admin/analytics/grafana/
serve_from_sub_path = true

[security]
admin_user = admin
admin_password = ${process.env.GRAFANA_ADMIN_PASSWORD || 'admin'}

[auth]
disable_login_form = false

[auth.proxy]
enabled = true
header_name = X-WEBAUTH-USER
header_property = username
auto_sign_up = true

[datasources]
datasources_path = ${GRAFANA_CONFIG_DIR}/datasources
`;

// Write Grafana configuration
fs.writeFileSync(GRAFANA_CONFIG_FILE, grafanaConfig);

// Create datasources directory
const datasourcesDir = path.join(GRAFANA_CONFIG_DIR, 'datasources');
if (!fs.existsSync(datasourcesDir)) {
  fs.mkdirSync(datasourcesDir, { recursive: true });
}

// Configure Prometheus datasource
const prometheusDataSource = {
  apiVersion: 1,
  datasources: [
    {
      name: 'Prometheus',
      type: 'prometheus',
      access: 'proxy',
      url: 'http://localhost:9090',
      isDefault: true,
      jsonData: {
        httpMethod: 'GET',
        timeInterval: '15s',
      },
      editable: true,
    },
  ],
};

fs.writeFileSync(
  path.join(datasourcesDir, 'prometheus.yaml'),
  JSON.stringify(prometheusDataSource, null, 2)
);

let grafanaProcess: any = null;

export function startGrafanaServer() {
  if (grafanaProcess) {
    return;
  }

  try {
    grafanaProcess = spawn('grafana-server', [
      '--config', GRAFANA_CONFIG_FILE,
      '--homepath', '/usr/share/grafana',
    ]);

    grafanaProcess.stdout.on('data', (data: Buffer) => {
      log('Grafana:', data.toString());
    });

    grafanaProcess.stderr.on('data', (data: Buffer) => {
      log('Grafana Error:', data.toString());
    });

    grafanaProcess.on('close', (code: number) => {
      log(`Grafana process exited with code ${code}`);
      grafanaProcess = null;
    });

    log('Grafana server started');
  } catch (error) {
    log('Failed to start Grafana:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

export function stopGrafanaServer() {
  if (grafanaProcess) {
    grafanaProcess.kill();
    grafanaProcess = null;
    log('Grafana server stopped');
  }
}

export const GRAFANA_INTERNAL_URL = `http://localhost:${GRAFANA_PORT}`;
