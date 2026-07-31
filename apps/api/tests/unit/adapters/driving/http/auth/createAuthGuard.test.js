const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createAuthGuard } = require('../../../../../../src/adapters/driving/http/auth/createAuthGuard');

function buildApp(jwtSecret) {
  const app = express();
  app.get('/protected', createAuthGuard(jwtSecret), (req, res) => res.status(200).json({ ok: true }));
  return app;
}

describe('createAuthGuard', () => {
  it('allows a request with a valid Bearer token', async () => {
    const token = jwt.sign({ sub: 'admin' }, 'test-secret');

    const response = await request(buildApp('test-secret')).get('/protected').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
  });

  it('rejects a request with no Authorization header', async () => {
    const response = await request(buildApp('test-secret')).get('/protected');

    expect(response.status).toBe(401);
  });

  it('rejects a request with a malformed Authorization header', async () => {
    const response = await request(buildApp('test-secret')).get('/protected').set('Authorization', 'not-a-bearer-token');

    expect(response.status).toBe(401);
  });

  it('rejects a token signed with a different secret', async () => {
    const token = jwt.sign({ sub: 'admin' }, 'a-different-secret');

    const response = await request(buildApp('test-secret')).get('/protected').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  it('rejects an expired token', async () => {
    const token = jwt.sign({ sub: 'admin' }, 'test-secret', { expiresIn: -10 });

    const response = await request(buildApp('test-secret')).get('/protected').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });
});
