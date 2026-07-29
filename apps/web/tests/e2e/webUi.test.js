import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { test, expect } from '@playwright/test';
import { createApp } from '../../../api/src/server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Regular Playwright browser testing, not _electron (see
// apps/desktop/tests/e2e/mainWindow.test.js for why that launcher is
// currently blocked upstream). apps/web is served over real HTTP here, the
// same way apps/desktop's main.js serves it in production — loading it via
// file:// doesn't work because Chromium blocks `<script type="module">`
// over the file:// protocol (a CORS restriction), which is exactly the bug
// this test setup exists to avoid re-introducing.
test.describe('apps/web UI', () => {
  let apiServer;
  let webServer;
  let closeCompositionRoot;
  let apiPort;
  let webPort;

  test.beforeAll(async () => {
    const { app, close } = createApp({ databasePath: ':memory:' });
    closeCompositionRoot = close;
    apiServer = await new Promise((resolve) => {
      const httpServer = app.listen(0, '127.0.0.1', () => resolve(httpServer));
    });
    apiPort = apiServer.address().port;

    const staticApp = express();
    staticApp.use(express.static(path.join(__dirname, '../../')));
    webServer = await new Promise((resolve) => {
      const httpServer = staticApp.listen(0, '127.0.0.1', () => resolve(httpServer));
    });
    webPort = webServer.address().port;
  });

  test.afterAll(async () => {
    await new Promise((resolve) => apiServer.close(resolve));
    await new Promise((resolve) => webServer.close(resolve));
    closeCompositionRoot();
  });

  function goto(page) {
    return page.goto(`http://127.0.0.1:${webPort}/index.html?apiPort=${apiPort}`);
  }

  test('lists real ports from the API', async ({ page }) => {
    await goto(page);

    await expect(page.locator('#ports-list .port-row').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#error-banner')).toBeHidden();
    await expect(page.locator('#port-count')).toContainText('porta');
  });

  test('protects a port by clicking its dot', async ({ page }) => {
    await goto(page);
    const firstRow = page.locator('#ports-list .port-row').first();
    await expect(firstRow).toBeVisible({ timeout: 15000 });

    await firstRow.locator('.port-dot').click();

    await expect(page.locator('#error-banner')).toBeHidden();
    await expect(firstRow).toHaveClass(/protected/);
    await expect(firstRow.locator('.port-dot')).toBeDisabled();
  });

  test('shows an error banner when the API is unreachable', async ({ page }) => {
    await page.goto(`http://127.0.0.1:${webPort}/index.html?apiPort=1`);

    await expect(page.locator('#error-banner')).toBeVisible({ timeout: 10000 });
  });
});
