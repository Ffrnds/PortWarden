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
    const { app, close, attachWebSocket } = createApp({ databasePath: ':memory:' });
    closeCompositionRoot = close;
    apiServer = await new Promise((resolve) => {
      const httpServer = app.listen(0, '127.0.0.1', () => resolve(httpServer));
    });
    apiPort = apiServer.address().port;
    attachWebSocket(apiServer);

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

    await expect(page.locator('#ports-list .port-row').first()).toBeVisible({ timeout: 31000 });
    await expect(page.locator('#error-banner')).toBeHidden();
    await expect(page.locator('#port-count')).toContainText('porta');
  });

  test('protects a port by clicking its dot, and unprotects it by clicking again', async ({ page }) => {
    // Two full protect/unprotect round trips, each triggering a real
    // netstat+tasklist refresh — under heavy system load each can take
    // 20-30s, which adds up past the default 45s per-test timeout even
    // though no single assertion's own timeout is hit.
    test.setTimeout(120000);

    await goto(page);
    const firstRow = page.locator('#ports-list .port-row').first();
    await expect(firstRow).toBeVisible({ timeout: 31000 });

    await firstRow.locator('.port-dot').click();

    await expect(page.locator('#error-banner')).toBeHidden();
    await expect(firstRow).toHaveClass(/protected/, { timeout: 31000 });

    await firstRow.locator('.port-dot').click();

    await expect(page.locator('#error-banner')).toBeHidden();
    await expect(firstRow).not.toHaveClass(/protected/, { timeout: 31000 });
  });

  test('adds a note to a port and shows it on the row', async ({ page }) => {
    await goto(page);
    const firstRow = page.locator('#ports-list .port-row').first();
    await expect(firstRow).toBeVisible({ timeout: 31000 });

    page.once('dialog', (dialog) => dialog.accept('Meu backend Node'));
    await firstRow.locator('.port-info').click();

    await expect(firstRow.locator('.port-note')).toHaveText('Meu backend Node');
  });

  test('shows an error banner when the API is unreachable', async ({ page }) => {
    await page.goto(`http://127.0.0.1:${webPort}/index.html?apiPort=1`);

    await expect(page.locator('#error-banner')).toBeVisible({ timeout: 15000 });
  });

  test('opens and closes the filter panel', async ({ page }) => {
    await goto(page);
    await expect(page.locator('#ports-list .port-row').first()).toBeVisible({ timeout: 31000 });

    await expect(page.locator('#filter-panel')).toBeHidden();
    await page.locator('#filter-button').click();
    await expect(page.locator('#filter-panel')).toBeVisible();
    await page.locator('#filter-button').click();
    await expect(page.locator('#filter-panel')).toBeHidden();
  });

  test('hiding system ports removes System (pid 4) from the list', async ({ page }) => {
    await goto(page);
    const list = page.locator('#ports-list .port-row');
    await expect(list.first()).toBeVisible({ timeout: 31000 });

    const systemRow = list.filter({ hasText: 'System' }).first();
    await expect(systemRow).toBeVisible();

    await page.locator('#filter-button').click();
    await page.locator('#hide-system-toggle').check();

    await expect(list.filter({ hasText: 'System' })).toHaveCount(0);
  });

  test('hides a process by name and restores it from the filter panel', async ({ page }) => {
    await goto(page);
    const firstRow = page.locator('#ports-list .port-row').first();
    await expect(firstRow).toBeVisible({ timeout: 31000 });

    const processName = await firstRow.locator('.port-process').textContent();
    const matchingRows = page.locator('#ports-list .port-row', { hasText: processName });
    const countBeforeHiding = await matchingRows.count();

    await firstRow.locator('.row-hide-btn').click();

    await expect(matchingRows).toHaveCount(0);

    await page.locator('#filter-button').click();
    await expect(page.locator('#hidden-ports-list li')).toHaveCount(1);
    await page.locator('.unhide-btn').click();

    await expect(matchingRows).toHaveCount(countBeforeHiding);
  });

  test('disintegrates a real disposable process when killed', async ({ page }) => {
    // KillPortUseCase re-lists every port (real netstat+tasklist) before
    // killing — on a dev machine with 60-80+ real ports open that can take
    // a while, so this test gets a longer leash than the others.
    test.setTimeout(90000);

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
      await expect(targetRow).toBeVisible({ timeout: 31000 });

      const exited = new Promise((resolve) => child.once('exit', resolve));
      await targetRow.locator('.kill-btn').click();

      await expect(targetRow.locator('.shard').first()).toBeVisible({ timeout: 80000 });
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

  test('filters the port list by typing in the search bar', async ({ page }) => {
    await goto(page);
    const firstRow = page.locator('#ports-list .port-row').first();
    await expect(firstRow).toBeVisible({ timeout: 31000 });

    const totalRows = await page.locator('#ports-list .port-row').count();
    // Search on the PID rather than the process name: several rows can
    // share a process name (svchost.exe, browser helpers), but a PID search
    // term is guaranteed to narrow the list down from "everything".
    const processLineText = await firstRow.locator('.port-process').textContent();
    const pid = processLineText.match(/PID (\d+)/)[1];

    await page.locator('#search-button').click();
    await expect(page.locator('#search-bar')).toBeVisible();
    await page.locator('#search-input').fill(pid);

    const filteredRows = page.locator('#ports-list .port-row');
    await expect(filteredRows.first()).toBeVisible();
    const filteredCount = await filteredRows.count();
    expect(filteredCount).toBeLessThan(totalRows);
    for (const row of await filteredRows.all()) {
      await expect(row.locator('.port-process')).toContainText(pid);
    }

    await page.locator('#search-input').fill('');
    // Not an exact-count comparison against the earlier snapshot: this hits
    // a real, live `netstat` on the dev machine, and the real port count can
    // drift by a port or two between the start of the test and here.
    // Clearing the search should still restore (approximately) everything.
    await expect
      .poll(async () => page.locator('#ports-list .port-row').count(), { timeout: 15000 })
      .toBeGreaterThan(filteredCount);
  });

  test('renames a process and shows the alias instead of the raw name', async ({ page }) => {
    await goto(page);
    const firstRow = page.locator('#ports-list .port-row').first();
    await expect(firstRow).toBeVisible({ timeout: 31000 });

    page.once('dialog', (dialog) => dialog.accept('Meu Apelido'));
    await firstRow.locator('.row-rename-btn').click();

    await expect(firstRow.locator('.port-process')).toContainText('Meu Apelido');
  });

  test('switches to the outbound connections tab and back', async ({ page }) => {
    await goto(page);
    await expect(page.locator('#ports-list .port-row').first()).toBeVisible({ timeout: 31000 });

    await page.locator('#tab-connections').click();

    await expect(page.locator('#tab-connections')).toHaveClass(/active/);
    await expect(page.locator('#ports-list')).toBeHidden();
    await expect(page.locator('#connections-list')).toBeVisible();
    await expect(page.locator('#error-banner')).toBeHidden({ timeout: 15000 });

    await page.locator('#tab-ports').click();

    await expect(page.locator('#tab-ports')).toHaveClass(/active/);
    await expect(page.locator('#ports-list')).toBeVisible();
    await expect(page.locator('#connections-list')).toBeHidden();
  });

  test('receives a real-time snapshot over the WebSocket connection', async ({ page }) => {
    const wsPromise = page.waitForEvent('websocket', { predicate: (ws) => ws.url().includes('/ws'), timeout: 15000 });

    await goto(page);
    const ws = await wsPromise;

    const snapshot = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timed out waiting for a snapshot frame')), 15000);
      ws.on('framereceived', ({ payload }) => {
        const message = JSON.parse(payload);
        if (message.type === 'snapshot') {
          clearTimeout(timer);
          resolve(message);
        }
      });
    });

    expect(Array.isArray(snapshot.ports)).toBe(true);
    expect(Array.isArray(snapshot.connections)).toBe(true);
    expect(Array.isArray(snapshot.protectedPorts)).toBe(true);
    expect(Array.isArray(snapshot.alerts)).toBe(true);
  });
});
