import { spawn } from 'child_process';
import { log } from '../vite';
import path from 'path';
import fs from 'fs';

const GRAFANA_PORT = 3001; // Different from our main app port
const GRAFANA_CONFIG_DIR = path.resolve(process.cwd(), 'grafana');
const GRAFANA_DATA_DIR = path.join(GRAFANA_CONFIG_DIR, 'data');
const GRAFANA_CONFIG_FILE = path.join(GRAFANA_CONFIG_DIR, 'grafana.ini');
const GRAFANA_PLUGINS_DIR = path.join(GRAFANA_CONFIG_DIR, 'plugins');
const GRAFANA_PROVISIONING_DIR = path.join(GRAFANA_CONFIG_DIR, 'provisioning');

// Ensure Grafana directories exist
[GRAFANA_CONFIG_DIR, GRAFANA_DATA_DIR, GRAFANA_PLUGINS_DIR, GRAFANA_PROVISIONING_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
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
root_url = %(protocol)s://%(domain)s/admin/analytics/grafana/
serve_from_sub_path = true

[security]
admin_user = admin
admin_password = ${process.env.GRAFANA_ADMIN_PASSWORD || 'admin'}
disable_initial_admin_creation = false

[auth]
disable_login_form = true
disable_signout_menu = true

[auth.proxy]
enabled = true
header_name = X-WEBAUTH-USER
header_property = username
auto_sign_up = true
sync_ttl = 60
whitelist = 127.0.0.1

[users]
allow_sign_up = false
auto_assign_org = true
auto_assign_org_role = Admin

[datasources]
datasources_path = ${GRAFANA_CONFIG_DIR}/datasources
`;

// Write Grafana configuration
fs.writeFileSync(GRAFANA_CONFIG_FILE, grafanaConfig, { mode: 0o644 });

let grafanaProcess: any = null;

export function startGrafanaServer() {
  if (grafanaProcess) {
    log('Grafana server already running');
    return;
  }

  try {
    log('Starting Grafana server...');
    const grafanaServerPath = '/nix/store/2m2kacwqa9v8wd09c1p4pp2cx99bviww-grafana-10.4.3/bin/grafana-server';

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