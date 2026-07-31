const express = require('express');
const request = require('supertest');
const { createListAlertsController } = require('../../../../../../src/adapters/driving/http/controllers/createListAlertsController');

function buildApp(detectSuspiciousActivityUseCase) {
  const app = express();
  app.get('/api/alerts', createListAlertsController(detectSuspiciousActivityUseCase));
  return app;
}

describe('createListAlertsController', () => {
  it('responds with the mapped list of alerts', async () => {
    const usage = {
      portNumber: { value: 31337 },
      protocol: { value: 'TCP' },
      pid: { value: 1234 },
      processName: 'node.exe',
    };
    const detectSuspiciousActivityUseCase = {
      execute: async () => [{ subject: usage, kind: 'listening', reasons: ['suspicious'] }],
    };

    const response = await request(buildApp(detectSuspiciousActivityUseCase)).get('/api/alerts');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        type: 'listening',
        port: 31337,
        protocol: 'TCP',
        pid: 1234,
        processName: 'node.exe',
        reasons: ['suspicious'],
      },
    ]);
  });

  it('forwards errors to the next handler', async () => {
    const detectSuspiciousActivityUseCase = {
      execute: async () => {
        throw new Error('inspection failed');
      },
    };
    const app = buildApp(detectSuspiciousActivityUseCase);
    app.use((error, req, res, next) => res.status(500).json({ error: error.message })); // eslint-disable-line no-unused-vars

    const response = await request(app).get('/api/alerts');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('inspection failed');
  });
});
