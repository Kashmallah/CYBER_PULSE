const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

let mainWindow;
let snifferProcess = null;
let serverProcess = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let isDashboardLoaded = false;
let retryTimer = null;

function loadServerDashboard() {
  if (isDashboardLoaded) return;
  const checkUrl = 'http://127.0.0.1:8000/api/fleet/endpoints';
  const targetUrl = 'http://127.0.0.1:8000/server';
  let attempts = 0;
  const maxAttempts = 30;

  function tryConnect() {
    if (isDashboardLoaded) return;
    attempts++;

    let hasHandled = false;
    const req = http.get(checkUrl, (res) => {
      if (hasHandled) return;
      hasHandled = true;

      if (res.statusCode === 200 || res.statusCode === 304) {
        if (!isDashboardLoaded) {
          isDashboardLoaded = true;
          if (retryTimer) clearTimeout(retryTimer);
          console.log('[Electron] SOC Backend ready. Loading SOC Master Dashboard...');
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.loadURL(targetUrl);
          }
        }
      } else {
        scheduleRetry();
      }
    });

    req.on('error', () => {
      if (hasHandled) return;
      hasHandled = true;
      scheduleRetry();
    });

    req.setTimeout(1200, () => {
      req.destroy();
      if (!hasHandled) {
        hasHandled = true;
        scheduleRetry();
      }
    });
  }

  function scheduleRetry() {
    if (isDashboardLoaded) return;
    if (retryTimer) clearTimeout(retryTimer);
    if (attempts < maxAttempts && mainWindow && !mainWindow.isDestroyed()) {
      retryTimer = setTimeout(tryConnect, 800);
    } else if (mainWindow && !mainWindow.isDestroyed() && !isDashboardLoaded) {
      isDashboardLoaded = true;
      mainWindow.loadURL(targetUrl);
    }
  }

  // Ensure backend is running
  startBackendServer();
  // Poll until ready
  tryConnect();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0a0d14',
    title: 'CYBER PULSE Central SOC Master Platform',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
    show: false
  });

  const args = process.argv;
  const isClientMode = args.includes('--mode=client');

  if (isClientMode) {
    mainWindow.setTitle('CYBER PULSE Endpoint Client Enclave & Shield');
    mainWindow.loadURL('http://localhost:5174/client').catch(() => {
      mainWindow.loadURL('http://localhost:8000/client');
    });
  } else {
    mainWindow.setTitle('CYBER PULSE Central SOC Master Platform');
    if (isDev && process.env.VITE_DEV_SERVER_URL) {
      mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
      loadServerDashboard();
    }
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    cleanupProcesses();
  });
}

function startBackgroundSniffer(clientId = 'win-prod-01', osType = 'windows') {
  if (snifferProcess) return;
  const rootDir = path.resolve(__dirname, '..');
  const snifferScript = path.join(rootDir, 'live_sniffer.py');

  console.log(`[Electron] Spawning live_sniffer.py child process (${clientId}, ${osType})...`);
  snifferProcess = spawn('python', [snifferScript, '--client_id', clientId, '--os_type', osType], {
    cwd: rootDir,
    stdio: 'inherit'
  });

  snifferProcess.on('exit', (code) => {
    console.log(`[Electron] live_sniffer.py exited with code ${code}`);
    snifferProcess = null;
  });
}

function startBackendServer() {
  if (serverProcess) return;
  const rootDir = path.resolve(__dirname, '..');
  const serverScript = path.join(rootDir, 'backend', 'server_api.py');

  console.log(`[Electron] Spawning backend server_api.py...`);
  serverProcess = spawn('python', [serverScript], {
    cwd: rootDir,
    stdio: 'inherit'
  });

  serverProcess.on('exit', (code) => {
    console.log(`[Electron] server_api.py exited with code ${code}`);
    serverProcess = null;
  });
}

function cleanupProcesses() {
  if (snifferProcess) {
    snifferProcess.kill();
    snifferProcess = null;
  }
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

// IPC Handlers
ipcMain.handle('get-autostart-status', async () => {
  if (process.platform === 'win32' || process.platform === 'darwin') {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  }
  return false;
});

ipcMain.handle('set-autostart-status', async (event, enable) => {
  if (process.platform === 'win32' || process.platform === 'darwin') {
    app.setLoginItemSettings({
      openAtLogin: enable,
      openAsHidden: true
    });
    return true;
  } else if (process.platform === 'linux') {
    const autostartDir = path.join(process.env.HOME || '', '.config', 'autostart');
    const desktopFile = path.join(autostartDir, 'cyberpulse.desktop');
    if (enable) {
      if (!fs.existsSync(autostartDir)) fs.mkdirSync(autostartDir, { recursive: true });
      const content = `[Desktop Entry]\nType=Application\nExec=${process.execPath}\nHidden=false\nNoDisplay=false\nX-GNOME-Autostart-enabled=true\nName=CyberPulse\nComment=Cyber Pulse Endpoint Agent\n`;
      fs.writeFileSync(desktopFile, content);
    } else {
      if (fs.existsSync(desktopFile)) fs.unlinkSync(desktopFile);
    }
    return true;
  }
  return false;
});

ipcMain.handle('spawn-daemon', (event, { role, clientId, osType }) => {
  if (role === 'admin') {
    startBackendServer();
  } else {
    startBackgroundSniffer(clientId, osType);
  }
  return true;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  cleanupProcesses();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
