const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { createApp } = require('../../../api/src/server');

// Regular Playwright browser testing, not _electron (see mainWindow.test.js
// for why that launcher is currently blocked upstream). This still proves
// the real thing that matters: the actual apps/web files, loaded for real,
// talking to a real running apps/api instance — just without the Electron
// window chrome around it, since that part is what's untestable right now.
test.describe('apps/web UI', () => {
  let server;
  let closeCompositionRoot;
  let apiPort;

  test.beforeAll(async () => {
    const { app, close } = createApp({ databasePath: ':memory:' });
    closeCompositionRoot = close;
    server = await new Promise((resolve) => {
      const httpServer = app.listen(0, '127.0.0.1', () => resolve(httpServer));
    });
    apiPort = server.address().port;
  });

  test.afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    closeCompositionRoot();
  });

  function goto(page) {
    const filePath = path.join(__dirname, '../../../web/index.html');
    return page.goto(`file://${filePath}?apiPort=${apiPort}`);
  }

  test('lists real ports from the API', async ({ page }) => {
    await goto(page);

    await expect(page.locator('#ports-list .port-row').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#error-banner')).toBeHidden();
    await expect(page.locator('#port-count')).toContainText('porta');
  });

  test('protects a port by clicking its dot', async ({ page }) => {
    await goto(page);
    const firstRow = page.locator('#ports-list .port-row').first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    await firstRow.locator('.port-dot').click();

    await expect(page.locator('#error-banner')).toBeHidden();
    await expect(firstRow).toHaveClass(/protected/);
    await expect(firstRow.locator('.port-dot')).toBeDisabled();
  });

  test('shows an error banner when the API is unreachable', async ({ page }) => {
    const filePath = path.join(__dirname, '../../../web/index.html');
    await page.goto(`file://${filePath}?apiPort=1`);

    await expect(page.locator('#error-banner')).toBeVisible({ timeout: 10000 });
  });
});
