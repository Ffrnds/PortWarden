import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fork } from 'node:child_process';
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

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
  });

  test('lists real ports from the API', async ({ page }) => {
    await goto(page);

    await expect(page.locator('#ports-list .port-row').first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator('#error-banner')).toBeHidden();
    await expect(page.locator('#port-count')).toContainText('porta');
  });

  test('protects a port by clicking its dot', async ({ page }) => {
    await goto(page);
    const firstRow = page.locator('#ports-list .port-row').first();
    await expect(firstRow).toBeVisible({ timeout: 20000 });

    await firstRow.locator('.port-dot').click();

    await expect(page.locator('#error-banner')).toBeHidden();
    await expect(firstRow).toHaveClass(/protected/, { timeout: 20000 });
    await expect(firstRow.locator('.port-dot')).toBeDisabled();
  });

  test('shows an error banner when the API is unreachable', async ({ page }) => {
    await page.goto(`http://127.0.0.1:${webPort}/index.html?apiPort=1`);

    await expect(page.locator('#error-banner')).toBeVisible({ timeout: 15000 });
  });

  test('opens and closes the filter panel', async ({ page }) => {
    await goto(page);
    await expect(page.locator('#ports-list .port-row').first()).toBeVisible({ timeout: 20000 });

    await expect(page.locator('#filter-panel')).toBeHidden();
    await page.locator('#filter-button').click();
    await expect(page.locator('#filter-panel')).toBeVisible();
    await page.locator('#filter-button').click();
    await expect(page.locator('#filter-panel')).toBeHidden();
  });

  test('hiding system ports removes System (pid 4) from the list', async ({ page }) => {
    await goto(page);
    const list = page.locator('#ports-list .port-row');
    await expect(list.first()).toBeVisible({ timeout: 20000 });

    const systemRow = list.filter({ hasText: 'System' }).first();
    await expect(systemRow).toBeVisible();

    await page.locator('#filter-button').click();
    await page.locator('#hide-system-toggle').check();

    await expect(list.filter({ hasText: 'System' })).toHaveCount(0);
  });

  test('hides a port manually and restores it from the filter panel', async ({ page }) => {
    await goto(page);
    const firstRow = page.locator('#ports-list .port-row').first();
    await expect(firstRow).toBeVisible({ timeout: 20000 });

    const portNumber = await firstRow.locator('.port-number').textContent();
    await firstRow.locator('.row-hide-btn').click();

    await expect(page.locator('#ports-list .port-row', { hasText: portNumber })).toHaveCount(0);

    await page.locator('#filter-button').click();
    await expect(page.locator('#hidden-ports-list li')).toHaveCount(1);
    await page.locator('.unhide-btn').click();

    await expect(page.locator('#ports-list .port-row', { hasText: portNumber })).toHaveCount(1);
  });

  test('disintegrates a real disposable process when killed', async ({ page }) => {
    // fork() reports its port over the IPC channel (process.send), not
    // stdout — stdout can be fully buffered and never actually flush while
    // a long-lived child process stays alive.
    const child = fork(path.join(__dirname, 'fixtures/disposableTcpServer.js'), { silent: true });

    try {
      const targetPort = await new Promise((resolve) => {
        child.once('message', (msg) => resolve(msg.port));
      });

      await goto(page);
      const targetRow = page.locator(`#ports-list .port-row[data-port-key="${targetPort}/TCP"]`);
      await expect(targetRow).toBeVisible({ timeout: 20000 });

      const exited = new Promise((resolve) => child.once('exit', resolve));
      await targetRow.locator('.kill-btn').click();

      await expect(targetRow.locator('.shard').first()).toBeVisible();
      await exited;

      await expect(page.locator(`#ports-list .port-row[data-port-key="${targetPort}/TCP"]`)).toHaveCount(0, {
        timeout: 10000,
      });
    } finally {
      if (child.exitCode === null) {
        child.kill();
      }
    }
  });
});
