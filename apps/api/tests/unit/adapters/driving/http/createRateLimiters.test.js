const express = require('express');
const request = require('supertest');
const { createGeneralRateLimiter, createKillRateLimiter } = require('../../../../../src/adapters/driving/http/createRateLimiters');

describe('createGeneralRateLimiter', () => {
  it('allows requests under the limit through', async () => {
    const app = express();
    app.use(createGeneralRateLimiter({ limit: 2 }));
    app.get('/thing', (req, res) => res.status(200).json({ ok: true }));

    const response = await request(app).get('/thing');

    expect(response.status).toBe(200);
  });

  it('responds 429 with a JSON error once the limit is exceeded', async () => {
    const app = express();
    app.use(createGeneralRateLimiter({ limit: 1 }));
    app.get('/thing', (req, res) => res.status(200).json({ ok: true }));

    await request(app).get('/thing');
    const response = await request(app).get('/thing');

    expect(response.status).toBe(429);
    expect(response.body).toEqual({ error: 'Too many requests. Please try again in a moment.' });
  });
});

describe('createKillRateLimiter', () => {
  it('responds 429 with a JSON error once the limit is exceeded', async () => {
    const app = express();
    app.delete('/ports/:port', createKillRateLimiter({ limit: 1 }), (req, res) => res.status(200).json({ ok: true }));

    await request(app).delete('/ports/8080');
    const response = await request(app).delete('/ports/8080');

    expect(response.status).toBe(429);
    expect(response.body).toEqual({ error: 'Too many requests. Please try again in a moment.' });
  });
});
