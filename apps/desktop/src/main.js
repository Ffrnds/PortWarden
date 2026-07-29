const path = require('node:path');
const { app, BrowserWindow, ipcMain } = require('electron');
const { createApp } = require('../../api/src/server');
const { createTray } = require('./tray');

// Electron 30+ rejects `--remote-debugging-port` as a raw CLI flag (a
// security hardening change) — Playwright's electron.launch() still passes
// it that way, so its own launcher fails against modern Electron
// (https://github.com/microsoft/playwright/issues/39008, unresolved as of
// Playwright 1.62 / Electron 43). The documented workaround is to
// re-enable it from inside the app via commandLine.appendSwitch, but doing
// that unconditionally would leave a real, shipped app remotely debuggable
// on every launch — so it's gated behind a test-only env var instead.
if (process.env.PORT_MANAGER_E2E === '1') {
  app.commandLine.appendSwitch('remote-debugging-port', '0');
}

let mainWindow = null;
let apiHandle = null;
let tray = null;
let isQuitting = false;

async function startEmbeddedApi() {
  const { app: expressApp, close: closeCompositionRoot } = createApp();

  const httpServer = await new Promise((resolve) => {
    const server = expressApp.listen(0, '127.0.0.1', () => resolve(server));
  });

  return {
    port: httpServer.address().port,
    stop() {
      httpServer.close();
      closeCompositionRoot();
    },
  };
}

async function createMainWindow() {
  apiHandle = await startEmbeddedApi();

  mainWindow = new BrowserWindow({
    width: 360,
    height: 480,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../../web/index.html'), {
    search: `apiPort=${apiHandle.port}`,
  });

  // Clicking the X hides the window instead of closing the app — the tray
  // icon is what keeps Port Manager (and its embedded API) running.
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  tray = createTray(mainWindow, {
    onQuit: () => {
      isQuitting = true;
      app.quit();
    },
  });
}

ipcMain.on('port-manager:hide-window', () => {
  mainWindow?.hide();
});

app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
  // No-op on purpose: the app lives in the tray until "Quit" is chosen.
});

app.on('before-quit', () => {
  isQuitting = true;
  apiHandle?.stop();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});
