const express = require('express');
const request = require('supertest');
const { createRequestLogger } = require('../../../../../src/adapters/driving/http/requestLogger');

function buildApp(logger) {
  const app = express();
  app.use(createRequestLogger(logger));
  app.get('/hello', (req, res) => res.status(200).json({ ok: true }));
  app.get('/boom', (req, res) => res.status(500).json({ ok: false }));
  return app;
}

describe('createRequestLogger', () => {
  it('logs the method, path, status code, and a duration after the response finishes', async () => {
    const entries = [];
    const logger = { info: (message, meta) => entries.push({ message, meta }) };

    await request(buildApp(logger)).get('/hello');

    expect(entries).toHaveLength(1);
    expect(entries[0].message).toBe('request completed');
    expect(entries[0].meta).toMatchObject({ method: 'GET', path: '/hello', statusCode: 200 });
    expect(typeof entries[0].meta.durationMs).toBe('number');
  });

  it('logs non-2xx responses too, with their real status code', async () => {
    const entries = [];
    const logger = { info: (message, meta) => entries.push({ message, meta }) };

    await request(buildApp(logger)).get('/boom');

    expect(entries[0].meta.statusCode).toBe(500);
  });
});
