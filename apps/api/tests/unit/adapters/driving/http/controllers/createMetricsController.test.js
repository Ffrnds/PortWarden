const express = require('express');
const request = require('supertest');
const { createMetricsController } = require('../../../../../../src/adapters/driving/http/controllers/createMetricsController');

function buildApp(metricsAdapter) {
  const app = express();
  app.get('/metrics', createMetricsController(metricsAdapter));
  return app;
}

describe('createMetricsController', () => {
  it('responds with the metrics text and the adapter content type', async () => {
    const metricsAdapter = {
      contentType: 'text/plain; version=0.0.4',
      metrics: async () => 'port_manager_processes_terminated_total 3',
    };

    const response = await request(buildApp(metricsAdapter)).get('/metrics');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.text).toBe('port_manager_processes_terminated_total 3');
  });

  it('forwards errors to the next handler instead of throwing raw', async () => {
    const metricsAdapter = {
      contentType: 'text/plain',
      metrics: async () => {
        throw new Error('registry exploded');
      },
    };

    const app = express();
    app.get('/metrics', createMetricsController(metricsAdapter));
    app.use((error, req, res, next) => res.status(500).json({ error: error.message })); // eslint-disable-line no-unused-vars

    const response = await request(app).get('/metrics');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('registry exploded');
  });
});
