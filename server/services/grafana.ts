import { log } from '../vite';
import path from 'path';
//import fs from 'fs'; // Removed as it's no longer needed.

//const GRAFANA_PORT = 3001; // Removed as it's no longer needed.
//const GRAFANA_CONFIG_DIR = path.resolve(process.cwd(), 'grafana'); // Removed as it's no longer needed.
//const GRAFANA_DATA_DIR = path.join(GRAFANA_CONFIG_DIR, 'data'); // Removed as it's no longer needed.
//const GRAFANA_CONFIG_FILE = path.join(GRAFANA_CONFIG_DIR, 'grafana.ini'); // Removed as it's no longer needed.

// Removed as it's no longer needed.
// Ensure directories exist
//[GRAFANA_CONFIG_DIR, GRAFANA_DATA_DIR].forEach(dir => {
//  if (!fs.existsSync(dir)) {
//    fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
//    log(`Created Grafana directory: ${dir}`);
//  }
//});

// Removed as it's no longer needed.
// Basic Grafana configuration
//const grafanaConfig = `
//[paths]
//data = ${GRAFANA_DATA_DIR}
//
//[server]
//protocol = http
//http_port = ${GRAFANA_PORT}
//domain = localhost
//http_addr = 0.0.0.0
//serve_from_sub_path = true
//
//[security]
//admin_user = admin
//admin_password = admin
//allow_embedding = true
//cookie_secure = false
//cookie_samesite = none
//
//[auth]
//disable_login_form = false
//
//[auth.anonymous]
//enabled = true
//org_name = Main Org.
//org_role = Viewer
//
//[log]
//mode = console
//level = debug
//`;

// Removed as it's no longer needed.
// Write Grafana configuration file
//fs.writeFileSync(GRAFANA_CONFIG_FILE, grafanaConfig, { mode: 0o644 });
//log('Wrote Grafana configuration file');

//let grafanaProcess: any = null; // Removed as it's no longer needed.

// Removed as it's no longer needed.
//export async function startGrafanaServer(): Promise<void> {
//  return new Promise((resolve, reject) => {
//    if (grafanaProcess) {
//      log('Grafana server already running');
//      resolve();
//      return;
//    }
//
//    try {
//      log('Starting Grafana server...');
//      const grafanaServerPath = '/nix/store/2m2kacwqa9v8wd09c1p4pp2cx99bviww-grafana-10.4.3/bin/grafana-server';
//
//      grafanaProcess = spawn(grafanaServerPath, [
//        '--config', GRAFANA_CONFIG_FILE,
//        '--homepath', '/nix/store/2m2kacwqa9v8wd09c1p4pp2cx99bviww-grafana-10.4.3/share/grafana',
//      ]);
//
//      grafanaProcess.stdout.on('data', (data: Buffer) => {
//        log('Grafana:', data.toString());
//      });
//
//      grafanaProcess.stderr.on('data', (data: Buffer) => {
//        log('Grafana Error:', data.toString());
//      });
//
//      grafanaProcess.on('close', (code: number) => {
//        log(`Grafana process exited with code ${code}`);
//        grafanaProcess = null;
//      });
//
//      // Wait for server to start
//      let attempts = 0;
//      const maxAttempts = 5;
//      const checkInterval = setInterval(async () => {
//        attempts++;
//        try {
//          const response = await fetch(`http://localhost:${GRAFANA_PORT}/api/health`);
//          if (response.ok) {
//            clearInterval(checkInterval);
//            log('Grafana server started successfully');
//            resolve();
//          } else if (attempts >= maxAttempts) {
//            clearInterval(checkInterval);
//            reject(new Error('Failed to verify Grafana health check'));
//          }
//        } catch (error) {
//          if (attempts >= maxAttempts) {
//            clearInterval(checkInterval);
//            reject(error);
//          }
//        }
//      }, 1000);
//
//    } catch (error) {
//      log('Failed to start Grafana:', error instanceof Error ? error.message : String(error));
//      reject(error);
//    }
//  });
//}

// Removed as it's no longer needed.
//export function stopGrafanaServer() {
//  if (grafanaProcess) {
//    grafanaProcess.kill();
//    grafanaProcess = null;
//    log('Grafana server stopped');
//  }
//}

// Grafana service temporarily disabled
// Will be re-implemented as a separate service
export const GRAFANA_INTERNAL_URL = 'http://localhost:3001';