const express = require('express');
const request = require('supertest');
const {
  createLivenessController,
  createReadinessController,
} = require('../../../../../../src/adapters/driving/http/controllers/createHealthController');

describe('createLivenessController', () => {
  it('responds 200 with process uptime', async () => {
    const app = express();
    app.get('/health/live', createLivenessController());

    const response = await request(app).get('/health/live');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(typeof response.body.uptimeSeconds).toBe('number');
  });
});

describe('createReadinessController', () => {
  it('responds 200 when the database ping succeeds', async () => {
    const app = express();
    app.get('/health/ready', createReadinessController({ portHistoryRepository: { ping: () => {} } }));

    const response = await request(app).get('/health/ready');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok', checks: { database: { status: 'ok' } } });
  });

  it('responds 503 when the database ping throws', async () => {
    const app = express();
    const portHistoryRepository = {
      ping: () => {
        throw new Error('database is closed');
      },
    };
    app.get('/health/ready', createReadinessController({ portHistoryRepository }));

    const response = await request(app).get('/health/ready');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      status: 'error',
      checks: { database: { status: 'error', message: 'database is closed' } },
    });
  });
});
