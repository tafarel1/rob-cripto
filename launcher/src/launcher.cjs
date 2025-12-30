const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const net = require('net');
const http = require('http');

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m"
};

function log(service, message, color = colors.reset) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${color}[${service.padEnd(10)}]${colors.reset} ${message}`);
}

// Configuration Paths
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const CONFIG_PATH = path.join(PROJECT_ROOT, 'launcher/config/settings.json');
const LOGS_DIR = path.join(PROJECT_ROOT, 'launcher/logs');
const BACKUPS_DIR = path.join(PROJECT_ROOT, 'launcher/backups');
const LAUNCHER_PORT = 9999;

// Ensure dirs exist
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

let config;
try {
  config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
} catch (e) {
  log('Launcher', `Error reading config: ${e.message}`, colors.red);
  process.exit(1);
}

// State
const processes = {};

// Port Checking Utilities
function isPortTaken(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true); // Port is taken
      } else {
        resolve(false);
      }
    });
    server.once('listening', () => {
      server.close();
      resolve(false); // Port is free
    });
    server.listen(port);
  });
}

async function waitForPortTaken(port, timeout = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await isPortTaken(port)) return true;
    await new Promise(r => setTimeout(r, 1000));
  }
  return false;
}

// Service Management
async function startService(service) {
  log('Launcher', `Starting ${service.name}...`, colors.yellow);

  const alreadyTaken = await isPortTaken(service.port);
  if (alreadyTaken) {
    log(service.name, `Port ${service.port} is already in use.`, colors.yellow);
  }

  const servicePath = path.resolve(PROJECT_ROOT, service.path);
  const [cmd, ...args] = service.command.split(' ');
  
  const command = process.platform === 'win32' && (cmd === 'npm' || cmd === 'npx') ? `${cmd}.cmd` : cmd;

  const logFile = path.join(LOGS_DIR, `${service.name}.log`);
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });

  log(service.name, `Executing: ${command} ${args.join(' ')} in ${servicePath}`, colors.magenta);

  const proc = spawn(command, args, {
    cwd: servicePath,
    env: { ...process.env, PORT: service.port, FORCE_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  proc.stdout.on('data', (data) => {
    const line = data.toString().trim();
    if (line) {
      logStream.write(`[STDOUT] ${line}\n`);
    }
  });

  proc.stderr.on('data', (data) => {
    const line = data.toString().trim();
    if (line) {
      logStream.write(`[STDERR] ${line}\n`);
    }
  });

  proc.on('close', (code) => {
    log(service.name, `Process exited with code ${code}`, code === 0 ? colors.green : colors.red);
    delete processes[service.name];
    if (service.required && code !== 0 && code !== null) {
        log('Launcher', `${service.name} failed (required). Stopping all services...`, colors.red);
        stopAll();
    }
  });

  processes[service.name] = proc;

  log(service.name, `Waiting for port ${service.port}...`, colors.blue);
  const ready = await waitForPortTaken(service.port);
  
  if (ready) {
    log(service.name, `Service is UP and Listening on port ${service.port}`, colors.green);
  } else {
    log(service.name, `Timed out waiting for port ${service.port}. Check logs at ${logFile}`, colors.red);
  }
}

function stopAll() {
  log('Launcher', 'Stopping all services...', colors.yellow);
  for (const name in processes) {
    if (processes[name]) {
        try {
            if (process.platform === 'win32') {
                spawn("taskkill", ["/pid", processes[name].pid, '/f', '/t']);
            } else {
                processes[name].kill();
            }
        } catch (e) {
            console.error(`Error killing ${name}:`, e);
        }
    }
  }
  process.exit(0);
}

// Update Logic
function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { cwd, shell: true });
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', d => { stdout += d; });
    proc.stderr.on('data', d => { stderr += d; });
    
    proc.on('close', code => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || stdout));
    });
  });
}

function backupConfig() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUPS_DIR, `settings_${timestamp}.json`);
    try {
        fs.copyFileSync(CONFIG_PATH, backupFile);
        log('Backup', `Configuration backed up to ${backupFile}`, colors.green);
    } catch (e) {
        log('Backup', `Backup failed: ${e.message}`, colors.red);
    }
}

async function performUpdate() {
  if (!config.update || !config.update.enabled) return;
  
  log('Updater', 'Checking for updates...', colors.cyan);
  
  // Backup before update
  backupConfig();
  
  try {
    // Check if git is available
    await runCommand('git', ['--version'], PROJECT_ROOT);
  } catch (e) {
    log('Updater', 'Git not found. Skipping updates.', colors.yellow);
    return;
  }

  try {
    // Check if remote is configured
    try {
        await runCommand('git', ['remote', '-v'], PROJECT_ROOT);
    } catch {
        log('Updater', 'No git remote configured. Skipping updates.', colors.yellow);
        return;
    }

    const pullOutput = await runCommand('git', ['pull'], PROJECT_ROOT);
    
    if (pullOutput.includes('Already up to date')) {
      log('Updater', 'Already up to date.', colors.green);
      return;
    }

    log('Updater', 'Update found and downloaded:', colors.green);
    console.log(pullOutput.trim());

    // Check for package.json changes
    if (config.update.autoInstall && (pullOutput.includes('package.json') || pullOutput.includes('package-lock.json'))) {
      log('Updater', 'Dependencies changed. Installing...', colors.yellow);
      
      // Root
      if (fs.existsSync(path.join(PROJECT_ROOT, 'package.json'))) {
         log('Updater', 'Installing root dependencies...', colors.magenta);
         await runCommand('npm', ['install'], PROJECT_ROOT);
      }
      
      // Backend
      if (fs.existsSync(path.join(PROJECT_ROOT, 'backend/package.json'))) {
         log('Updater', 'Installing backend dependencies...', colors.magenta);
         await runCommand('npm', ['install'], path.join(PROJECT_ROOT, 'backend'));
      }

      // Frontend
      if (fs.existsSync(path.join(PROJECT_ROOT, 'frontend/package.json'))) {
         log('Updater', 'Installing frontend dependencies...', colors.magenta);
         await runCommand('npm', ['install'], path.join(PROJECT_ROOT, 'frontend'));
      }
      
      log('Updater', 'Dependencies updated successfully.', colors.green);
    }
    
    log('Updater', 'Update complete.', colors.green);
    
  } catch (e) {
    log('Updater', `Update failed: ${e.message}`, colors.red);
  }
}

// System Checks
function checkDiskSpace() {
    // Basic check using Node.js logic or simply warn if we can't write
    try {
        const testFile = path.join(PROJECT_ROOT, '.write_test');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
    } catch (e) {
        log('System', 'CRITICAL: No write permission or disk full!', colors.red);
        log('System', `Error: ${e.message}`, colors.red);
        // We don't exit, but we warn
    }
}

// Web Server
function getDashboardHTML() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RoboCrypto Launcher</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; }
    h1 { color: #38bdf8; margin-bottom: 30px; }
    .container { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; width: 100%; max-width: 800px; }
    .card { background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); transition: transform 0.2s; }
    .card:hover { transform: translateY(-2px); }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .service-name { font-size: 1.25rem; font-weight: bold; text-transform: capitalize; }
    .status-badge { padding: 4px 12px; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; }
    .running { background: #052e16; color: #4ade80; border: 1px solid #14532d; }
    .stopped { background: #450a0a; color: #f87171; border: 1px solid #7f1d1d; }
    .details { display: grid; gap: 8px; font-size: 0.9rem; color: #94a3b8; }
    .detail-row { display: flex; justify-content: space-between; }
    .footer { margin-top: 40px; color: #64748b; font-size: 0.875rem; }
    .refresh-hint { text-align: center; margin-top: 10px; font-size: 0.8rem; color: #475569; }
  </style>
</head>
<body>
  <h1>🚀 RoboCrypto Launcher</h1>
  <div id="services" class="container">Loading...</div>
  <div class="footer">Dashboard running on port ${LAUNCHER_PORT}</div>
  <script>
    async function update() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        document.getElementById('services').innerHTML = data.map(s => \`
          <div class="card">
            <div class="header">
              <div class="service-name">\${s.name}</div>
              <span class="status-badge \${s.status.toLowerCase()}">\${s.status}</span>
            </div>
            <div class="details">
              <div class="detail-row"><span>PID:</span> <span>\${s.pid || '-'}</span></div>
              <div class="detail-row"><span>Port:</span> <span>\${s.port}</span></div>
              <div class="detail-row"><span>Health:</span> <a href="\${s.healthUrl}" target="_blank" style="color: #38bdf8;">Check</a></div>
            </div>
          </div>
        \`).join('');
      } catch (e) {
        document.getElementById('services').innerHTML = '<div style="color:red">Error connecting to launcher</div>';
      }
    }
    setInterval(update, 2000);
    update();
  </script>
</body>
</html>
  `;
}

function startWebServer() {
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.url === '/' || req.url === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(getDashboardHTML());
    } else if (req.url === '/api/status') {
      const status = config.services.map(s => ({
        name: s.name,
        pid: processes[s.name] ? processes[s.name].pid : null,
        status: processes[s.name] ? 'Running' : 'Stopped',
        port: s.port,
        healthUrl: s.healthUrl
      }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(status));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      log('Launcher', `Web Interface port ${LAUNCHER_PORT} in use, skipping UI.`, colors.yellow);
    } else {
      console.error('Web Server Error:', err);
    }
  });

  server.listen(LAUNCHER_PORT, () => {
    log('Launcher', `Web Interface running at http://localhost:${LAUNCHER_PORT}`, colors.cyan);
  });
}

// Main Flow
async function main() {
  console.log(colors.green + `
  ██████╗  ██████╗ ██████╗  ██████╗ 
  ██╔══██╗██╔═══██╗██╔══██╗██╔═══██╗
  ██████╔╝██║   ██║██████╔╝██║   ██║
  ██╔══██╗██║   ██║██╔══██╗██║   ██║
  ██║  ██║╚██████╔╝██████╔╝╚██████╔╝
  ╚═╝  ╚═╝ ╚═════╝ ╚═════╝  ╚═════╝ 
  CRYPTO BOT LAUNCHER v${config.version}
  ` + colors.reset);

  log('System', `Node.js ${process.version} on ${process.platform}`, colors.blue);
  
  checkDiskSpace();
  await performUpdate();

  startWebServer();

  for (const service of config.services) {
    await startService(service);
  }

  log('Launcher', 'All services initialized successfully!', colors.green);
  log('Launcher', `Dashboard: http://localhost:${LAUNCHER_PORT}`, colors.green);
  log('Launcher', 'Press Ctrl+C to stop all services.', colors.yellow);
  
  setInterval(() => {}, 1000);
}

process.on('SIGINT', stopAll);
process.on('SIGTERM', stopAll);

main().catch(err => {
  console.error(err);
  stopAll();
});
