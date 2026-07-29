const path = require('node:path');
const express = require('express');
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

// Without this, Windows shows the generic "Electron" name/grouping in the
// taskbar (and package.json's "name": "desktop" as a fallback) instead of
// the actual product name.
app.setName('PortPulse');
if (process.platform === 'win32') {
  app.setAppUserModelId('com.portpulse.app');
}

let mainWindow = null;
let apiHandle = null;
let webHandle = null;
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

// apps/web uses native ES modules (<script type="module">), which Chromium
// refuses to load over file:// (blocked as a cross-origin request). Serving
// it over plain HTTP — from a second, separate static server, so apps/api
// stays a clean REST API with no frontend-serving concern — sidesteps that
// entirely.
async function startWebServer() {
  const staticApp = express();
  staticApp.use(express.static(path.join(__dirname, '../../web')));

  const httpServer = await new Promise((resolve) => {
    const server = staticApp.listen(0, '127.0.0.1', () => resolve(server));
  });

  return {
    port: httpServer.address().port,
    stop() {
      httpServer.close();
    },
  };
}

async function createMainWindow() {
  apiHandle = await startEmbeddedApi();
  webHandle = await startWebServer();

  mainWindow = new BrowserWindow({
    width: 360,
    height: 480,
    minWidth: 300,
    minHeight: 320,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${webHandle.port}/index.html?apiPort=${apiHandle.port}`);

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
  webHandle?.stop();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});
