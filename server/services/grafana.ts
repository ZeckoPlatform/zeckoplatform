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
    fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
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
http_port = ${GRAFANA_PORT}
domain = localhost
serve_from_sub_path = true
root_url = %(protocol)s://%(domain)s/admin/analytics/grafana/

[security]
admin_user = zeckoinfo
admin_password = Bobo19881
disable_initial_admin_creation = false
allow_embedding = true
cookie_samesite = none
cookie_secure = false

[auth]
disable_login_form = false
disable_signout_menu = false
oauth_auto_login = false

[auth.proxy]
enabled = true
header_name = X-WEBAUTH-USER
header_property = email
auto_sign_up = true
sync_ttl = 60
whitelist = *
headers = Name:X-WEBAUTH-NAME Role:X-WEBAUTH-ROLE Organization:X-WEBAUTH-ORG
enable_login_token = true

[users]
allow_sign_up = false
auto_assign_org = true
auto_assign_org_role = Admin

[auth.anonymous]
enabled = false

[dashboards]
versions_to_keep = 20
min_refresh_interval = 5s

[datasources]
datasources_path = ${GRAFANA_DATASOURCES_DIR}
`;

// Write Grafana configuration file
fs.writeFileSync(GRAFANA_CONFIG_FILE, grafanaConfig, { mode: 0o644 });
log('Wrote Grafana configuration file');

let grafanaProcess: any = null;

export function startGrafanaServer() {
  if (grafanaProcess) {
    log('Grafana server already running');
    return;
  }

  try {
    log('Starting Grafana server...');
    const grafanaServerPath = '/nix/store/2m2kacwqa9v8wd09c1p4pp2cx99bviww-grafana-10.4.3/bin/grafana-server';

    // Copy provisioning files if they don't exist
    const provisioningFiles = {
      'dashboards/dashboards.yaml': `
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
      path: /app/grafana/provisioning/dashboards
`,
      'datasources/prometheus.yaml': `
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
`
    };

    Object.entries(provisioningFiles).forEach(([file, content]) => {
      const filePath = path.join(GRAFANA_PROVISIONING_DIR, file);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, content, { mode: 0o644 });
        log(`Created provisioning file: ${file}`);
      }
    });

    grafanaProcess = spawn(grafanaServerPath, [
      '--config', GRAFANA_CONFIG_FILE,
      '--homepath', '/nix/store/2m2kacwqa9v8wd09c1p4pp2cx99bviww-grafana-10.4.3/share/grafana',
      '--pidfile', path.join(GRAFANA_CONFIG_DIR, 'grafana.pid'),
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