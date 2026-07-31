const swaggerUi = require('swagger-ui-express');

const openApiSpec = {
  openapi: '3.0.0',
  info: { title: 'Port Manager API', version: '1.0.0' },
  paths: {
    '/api/ports': {
      get: {
        summary: 'List ports currently in use',
        responses: { 200: { description: 'List of ports' } },
      },
    },
    '/api/ports/{port}': {
      delete: {
        summary: 'Kill the process using a port',
        parameters: [
          { name: 'port', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'protocol', in: 'query', required: false, schema: { type: 'string', enum: ['TCP', 'UDP'] } },
        ],
        responses: {
          200: { description: 'Process terminated' },
          400: { description: 'Invalid port/protocol' },
          403: { description: 'Port is protected' },
          404: { description: 'No process is using this port' },
          409: { description: 'Insufficient privilege to terminate the process' },
        },
      },
    },
    '/api/history': {
      get: {
        summary: 'List terminated-process history',
        responses: { 200: { description: 'History list' } },
      },
    },
    '/api/protection/{port}': {
      put: {
        summary: 'Mark a port as protected (never killable)',
        parameters: [{ name: 'port', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 204: { description: 'Port protected' }, 400: { description: 'Invalid port' } },
      },
      delete: {
        summary: 'Remove protection from a port',
        parameters: [{ name: 'port', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 204: { description: 'Port unprotected' }, 400: { description: 'Invalid port' } },
      },
    },
    '/api/protection': {
      get: {
        summary: 'List currently protected ports',
        responses: { 200: { description: 'List of protected port numbers' } },
      },
    },
    '/api/connections': {
      get: {
        summary:
          'List established outbound connections (remote host via reverse DNS, remote country/city via GeoIP, both best-effort)',
        responses: { 200: { description: 'List of outbound connections' } },
      },
    },
    '/metrics': {
      get: {
        summary: 'Prometheus metrics (scrape endpoint)',
        responses: { 200: { description: 'Metrics in Prometheus text exposition format' } },
      },
    },
    '/health/live': {
      get: {
        summary: 'Liveness probe — 200 whenever the process is running',
        responses: { 200: { description: 'Process is alive' } },
      },
    },
    '/health/ready': {
      get: {
        summary: 'Readiness probe — checks the database connection',
        responses: { 200: { description: 'Ready to serve requests' }, 503: { description: 'A dependency is unreachable' } },
      },
    },
    '/api/alerts': {
      get: {
        summary: 'List ports/connections matching known suspicious-port heuristics (basic pattern matching, not a threat feed)',
        responses: { 200: { description: 'List of alerts' } },
      },
    },
  },
};

function setupSwagger(app) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
}

module.exports = { setupSwagger, openApiSpec };
