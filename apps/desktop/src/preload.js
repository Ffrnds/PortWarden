// Intentionally minimal for now — the renderer talks to the embedded API
// over plain fetch() (it gets the port via the URL query string), so there
// is nothing privileged to bridge yet. This file exists so contextIsolation
// stays on and main.js has a valid preload path from the start; it'll grow
// once the renderer needs to ask the main process for something only Electron
// can do (e.g. hide-to-tray).
