const path = require('node:path');
const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');

// This is the one place in the whole project where we drive a real,
// on-screen Electron window instead of calling code in-process. It launches
// the actual app.js entry point (main.js), which itself starts the real
// embedded API — no fakes anywhere in this test.
test('opens an always-on-top window that loads the port list from the embedded API', async () => {
  const electronApp = await electron.launch({
    args: [path.join(__dirname, '../../')],
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '' },
  });

  try {
    const window = await electronApp.firstWindow();
    await window.waitForSelector('#app');

    const isAlwaysOnTop = await electronApp.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isAlwaysOnTop());
    expect(isAlwaysOnTop).toBe(true);

    await expect(window.locator('#app')).not.toHaveText('Loading…', { timeout: 10000 });
    await expect(window.locator('#app')).toContainText('port(s) in use');
  } finally {
    await electronApp.close();
  }
});
