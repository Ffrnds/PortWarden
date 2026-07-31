const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const request = require('supertest');
const { createApp } = require('../../src/server');

// The real end-to-end proof: the actual Express app, wired to the actual
// Windows adapters (real netstat/tasklist/taskkill, real SQLite file),
// listing and killing a disposable child process this test owns — never a
// real system process.
describe('Port Manager API (e2e)', () => {
  it('lists a real listener, kills it through the API, and records it in history', async () => {
    const databasePath = path.join(os.tmpdir(), `port-manager-e2e-${process.pid}-${Math.floor(Math.random() * 1e6)}.sqlite`);
    const { app, close, adminAccessKey } = createApp({ databasePath });

    const loginResponse = await request(app).post('/api/auth/login').send({ accessKey: adminAccessKey });
    expect(loginResponse.status).toBe(200);
    const authHeader = `Bearer ${loginResponse.body.token}`;

    const child = spawn(process.execPath, [
      '-e',
      "const s = require('net').createServer(); s.listen(0, '127.0.0.1', () => console.log(s.address().port)); setInterval(() => {}, 1000);",
    ]);

    try {
      // Data can arrive in fragments — wait for a full line (the newline
      // console.log appends), not just the first digit(s) to show up.
      const port = await new Promise((resolve) => {
        let buffer = '';
        child.stdout.on('data', (chunk) => {
          buffer += chunk.toString();
          const match = buffer.match(/(\d+)\r?\n/);
          if (match) {
            resolve(Number(match[1]));
          }
        });
      });

      const listResponse = await request(app).get('/api/ports');
      expect(listResponse.status).toBe(200);
      expect(listResponse.body.some((usage) => usage.port === port && usage.pid === child.pid)).toBe(true);

      const exited = new Promise((resolve) => child.once('exit', resolve));
      const killResponse = await request(app).delete(`/api/ports/${port}`).set('Authorization', authHeader);
      expect(killResponse.status).toBe(200);
      expect(killResponse.body.pid).toBe(child.pid);
      await exited;

      const historyResponse = await request(app).get('/api/history');
      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.some((event) => event.port === port && event.pid === child.pid)).toBe(true);

      const metricsResponse = await request(app).get('/metrics');
      expect(metricsResponse.status).toBe(200);
      expect(metricsResponse.text).toMatch(/port_manager_processes_terminated_total 1/);
    } finally {
      if (child.exitCode === null) {
        child.kill();
      }
      close();
      fs.rmSync(databasePath, { force: true });
    }
  }, 20000);
});
