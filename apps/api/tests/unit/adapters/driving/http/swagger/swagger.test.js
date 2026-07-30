const express = require('express');
const request = require('supertest');
const { setupSwagger, openApiSpec } = require('../../../../../../src/adapters/driving/http/swagger/swagger');

describe('openApiSpec', () => {
  it('documents all six API endpoints', () => {
    expect(Object.keys(openApiSpec.paths)).toEqual([
      '/api/ports',
      '/api/ports/{port}',
      '/api/history',
      '/api/protection/{port}',
      '/api/protection',
      '/metrics',
    ]);
  });
});

describe('setupSwagger', () => {
  it('serves the docs UI at /api-docs', async () => {
    const app = express();
    setupSwagger(app);

    const response = await request(app).get('/api-docs/');

    expect(response.status).toBe(200);
    expect(response.text).toContain('swagger-ui');
  });
});
