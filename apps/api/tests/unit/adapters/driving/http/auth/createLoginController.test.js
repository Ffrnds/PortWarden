const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createLoginController } = require('../../../../../../src/adapters/driving/http/auth/createLoginController');

function buildApp(config) {
  const app = express();
  app.use(express.json());
  app.post('/api/auth/login', createLoginController(config));
  return app;
}

describe('createLoginController', () => {
  it('issues a valid JWT when the access key matches', async () => {
    const app = buildApp({ adminAccessKey: 'correct-key', jwtSecret: 'test-secret' });

    const response = await request(app).post('/api/auth/login').send({ accessKey: 'correct-key' });

    expect(response.status).toBe(200);
    expect(typeof response.body.token).toBe('string');
    expect(jwt.verify(response.body.token, 'test-secret')).toMatchObject({ sub: 'admin' });
  });

  it('rejects a wrong access key with 401', async () => {
    const app = buildApp({ adminAccessKey: 'correct-key', jwtSecret: 'test-secret' });

    const response = await request(app).post('/api/auth/login').send({ accessKey: 'wrong-key' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBeDefined();
  });

  it('rejects a missing access key with 401', async () => {
    const app = buildApp({ adminAccessKey: 'correct-key', jwtSecret: 'test-secret' });

    const response = await request(app).post('/api/auth/login').send({});

    expect(response.status).toBe(401);
  });
});
