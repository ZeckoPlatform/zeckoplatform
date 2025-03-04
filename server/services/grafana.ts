import { log } from '../vite';
import path from 'path';
import fs from 'fs';

export const GRAFANA_PORT = 3001;
export const GRAFANA_INTERNAL_URL = `http://localhost:${GRAFANA_PORT}`;

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
root_url = %(protocol)s://%(domain)s:%(http_port)s
serve_from_sub_path = false
http_addr = 0.0.0.0

[security]
admin_user = admin
admin_password = ${process.env.GRAFANA_ADMIN_PASSWORD || 'admin'}
allow_embedding = true
cookie_secure = false
cookie_samesite = none

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

// No need to manage Grafana process anymore since we're using system service
export function startGrafanaServer(): Promise<void> {
  return new Promise((resolve) => {
    try {
      log('Starting Grafana server setup...');

      // Write Grafana configuration file
      fs.writeFileSync(GRAFANA_CONFIG_FILE, grafanaConfig);
      log('Wrote Grafana configuration file');

      // Write dashboards provisioning
      fs.writeFileSync(path.join(GRAFANA_DASHBOARDS_DIR, 'dashboards.yaml'), `
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
`);
      log('Wrote dashboards provisioning config');

      // Write datasources provisioning
      fs.writeFileSync(path.join(GRAFANA_DATASOURCES_DIR, 'datasources.yaml'), `
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
`);
      log('Wrote datasources provisioning config');
      resolve();
    } catch (error) {
      log('Failed to start Grafana:', error instanceof Error ? error.message : String(error));
      reject(error);
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