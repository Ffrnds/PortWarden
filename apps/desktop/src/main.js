const path = require('node:path');
const { app, BrowserWindow } = require('electron');
const { createApp } = require('../../api/src/server');

let mainWindow = null;
let apiHandle = null;

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
    width: 420,
    height: 600,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../../web/index.html'), {
    search: `apiPort=${apiHandle.port}`,
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  apiHandle?.stop();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});
