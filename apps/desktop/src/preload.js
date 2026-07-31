const { contextBridge, ipcRenderer } = require('electron');

// The renderer has no direct access to Electron/Node (contextIsolation +
// nodeIntegration: false) — this is the one controlled bridge, exposing
// only the single action the UI needs from the main process, nothing more.
contextBridge.exposeInMainWorld('portManager', {
  hideWindow: () => ipcRenderer.send('port-manager:hide-window'),
});
