import { spawn } from 'child_process';
import { log } from '../vite';
import path from 'path';
import fs from 'fs';

const GRAFANA_PORT = 3001;
const GRAFANA_CONFIG_DIR = path.resolve(process.cwd(), 'grafana');
const GRAFANA_DATA_DIR = path.join(GRAFANA_CONFIG_DIR, 'data');
const GRAFANA_CONFIG_FILE = path.join(GRAFANA_CONFIG_DIR, 'grafana.ini');
const GRAFANA_PLUGINS_DIR = path.join(GRAFANA_CONFIG_DIR, 'plugins');
const GRAFANA_PROVISIONING_DIR = path.join(GRAFANA_CONFIG_DIR, 'provisioning');
const GRAFANA_DASHBOARDS_DIR = path.join(GRAFANA_PROVISIONING_DIR, 'dashboards');
const GRAFANA_DATASOURCES_DIR = path.join(GRAFANA_PROVISIONING_DIR, 'datasources');

// Ensure all Grafana directories exist
[
  GRAFANA_CONFIG_DIR,
  GRAFANA_DATA_DIR,
  GRAFANA_PLUGINS_DIR,
  GRAFANA_PROVISIONING_DIR,
  GRAFANA_DASHBOARDS_DIR,
  GRAFANA_DATASOURCES_DIR
].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    log(`Created Grafana directory: ${dir}`);
  }
});

// Basic Grafana configuration
const grafanaConfig = `
[paths]
data = ${GRAFANA_DATA_DIR}
plugins = ${GRAFANA_PLUGINS_DIR}
provisioning = ${GRAFANA_PROVISIONING_DIR}

[server]
protocol = http
http_port = ${GRAFANA_PORT}
domain = localhost
root_url = %(protocol)s://%(domain)s:%(http_port)s/admin/analytics/grafana
serve_from_sub_path = true
http_addr = 0.0.0.0

[security]
admin_user = admin
admin_password = ${process.env.GRAFANA_ADMIN_PASSWORD || 'admin'}
allow_embedding = true
cookie_secure = false
cookie_samesite = none
secret_key = SW2YcwTIb9zpOOhoPsMm

[auth]
disable_login_form = false
disable_signout_menu = true

[auth.basic]
enabled = true

[users]
allow_sign_up = false
auto_assign_org = true
auto_assign_org_role = Admin

[dashboards]
min_refresh_interval = 5s
`;

let grafanaProcess: any = null;

export function startGrafanaServer() {
  if (grafanaProcess) {
    log('Grafana server already running');
    return;
  }

  try {
    log('Starting Grafana server setup...');

    // Write Grafana configuration file
    fs.writeFileSync(GRAFANA_CONFIG_FILE, grafanaConfig);
    log('Wrote Grafana configuration:', { 
      configPath: GRAFANA_CONFIG_FILE,
      port: GRAFANA_PORT,
      adminUser: 'admin'
    });

    // Write dashboards provisioning
    const dashboardsConfig = `
apiVersion: 1
providers:
  - name: 'Default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    editable: true
    allowUiUpdates: true
    options:
      path: ${GRAFANA_DASHBOARDS_DIR}
`;
    fs.writeFileSync(path.join(GRAFANA_DASHBOARDS_DIR, 'dashboards.yaml'), dashboardsConfig);
    log('Wrote dashboards provisioning config');

    // Write datasources provisioning
    const datasourcesConfig = `
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://localhost:9090
    isDefault: true
    editable: true
    jsonData:
      timeInterval: '15s'
      queryTimeout: '60s'
      httpMethod: GET
`;
    fs.writeFileSync(path.join(GRAFANA_DATASOURCES_DIR, 'datasources.yaml'), datasourcesConfig);
    log('Wrote datasources provisioning config');

    // Start Grafana server
    const grafanaServerPath = '/nix/store/2m2kacwqa9v8wd09c1p4pp2cx99bviww-grafana-10.4.3/bin/grafana-server';
    grafanaProcess = spawn(grafanaServerPath, [
      '--config', GRAFANA_CONFIG_FILE,
      '--homepath', '/nix/store/2m2kacwqa9v8wd09c1p4pp2cx99bviww-grafana-10.4.3/share/grafana'
    ]);

    grafanaProcess.stdout.on('data', (data: Buffer) => {
      log('Grafana stdout:', data.toString().trim());
    });

    grafanaProcess.stderr.on('data', (data: Buffer) => {
      log('Grafana stderr:', data.toString().trim());
    });

    grafanaProcess.on('close', (code: number) => {
      log(`Grafana process exited with code ${code}`);
      grafanaProcess = null;
    });

    log('Grafana server started successfully');
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