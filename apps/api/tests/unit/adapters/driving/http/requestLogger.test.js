const express = require('express');
const request = require('supertest');
const { createRequestLogger } = require('../../../../../src/adapters/driving/http/requestLogger');

function buildApp(logger, metricsAdapter) {
  const app = express();
  app.use(createRequestLogger(logger, metricsAdapter));
  app.get('/hello', (req, res) => res.status(200).json({ ok: true }));
  app.get('/boom', (req, res) => res.status(500).json({ ok: false }));
  app.get('/users/:id', (req, res) => res.status(200).json({ ok: true }));
  return app;
}

function buildFakeMetricsAdapter() {
  const recorded = [];
  return { recorded, recordHttpRequest: (entry) => recorded.push(entry) };
}

describe('createRequestLogger', () => {
  it('logs the method, path, status code, and a duration after the response finishes', async () => {
    const entries = [];
    const logger = { info: (message, meta) => entries.push({ message, meta }) };

    await request(buildApp(logger, buildFakeMetricsAdapter())).get('/hello');

    expect(entries).toHaveLength(1);
    expect(entries[0].message).toBe('request completed');
    expect(entries[0].meta).toMatchObject({ method: 'GET', path: '/hello', statusCode: 200 });
    expect(typeof entries[0].meta.durationMs).toBe('number');
  });

  it('logs non-2xx responses too, with their real status code', async () => {
    const entries = [];
    const logger = { info: (message, meta) => entries.push({ message, meta }) };

    await request(buildApp(logger, buildFakeMetricsAdapter())).get('/boom');

    expect(entries[0].meta.statusCode).toBe(500);
  });

  it('records an HTTP metric alongside the log entry', async () => {
    const logger = { info: () => {} };
    const metricsAdapter = buildFakeMetricsAdapter();

    await request(buildApp(logger, metricsAdapter)).get('/hello');

    expect(metricsAdapter.recorded).toHaveLength(1);
    expect(metricsAdapter.recorded[0]).toMatchObject({ method: 'GET', route: '/hello', statusCode: 200 });
    expect(metricsAdapter.recorded[0].durationSeconds).toBeGreaterThanOrEqual(0);
  });

  it('records the matched route pattern, not the raw URL, to keep metric cardinality low', async () => {
    const logger = { info: () => {} };
    const metricsAdapter = buildFakeMetricsAdapter();

    await request(buildApp(logger, metricsAdapter)).get('/users/1234');

    expect(metricsAdapter.recorded[0].route).toBe('/users/:id');
  });
});
