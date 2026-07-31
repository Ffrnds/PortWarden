const express = require('express');
const request = require('supertest');
const { createPortsRouter } = require('../../../../../../src/adapters/driving/http/routes/portsRoutes');
const { createErrorHandler } = require('../../../../../../src/adapters/driving/http/errorHandler');
const { PortUsage } = require('../../../../../../src/domain/entities/PortUsage');
const { OutboundConnection } = require('../../../../../../src/domain/entities/OutboundConnection');
const { PortNumber } = require('../../../../../../src/domain/value-objects/PortNumber');
const { Protocol } = require('../../../../../../src/domain/value-objects/Protocol');
const { ProcessId } = require('../../../../../../src/domain/value-objects/ProcessId');
const { ProcessTerminatedEvent } = require('../../../../../../src/domain/events/ProcessTerminatedEvent');
const { ProtectedPortError } = require('../../../../../../src/domain/exceptions/ProtectedPortError');
const { InsufficientPrivilegeError } = require('../../../../../../src/domain/exceptions/InsufficientPrivilegeError');

function buildUsage(port = 8080) {
  return new PortUsage({
    portNumber: new PortNumber(port),
    protocol: new Protocol('TCP'),
    pid: new ProcessId(1234),
    processName: 'node.exe',
  });
}

function buildApp(overrides = {}) {
  const useCases = {
    listPortsUseCase: { execute: async () => [] },
    killPortUseCase: { execute: async () => new ProcessTerminatedEvent(buildUsage(), new Date('2026-07-29T12:00:00.000Z')) },
    getPortHistoryUseCase: { execute: async () => [] },
    protectPortUseCase: { execute: async () => {} },
    unprotectPortUseCase: { execute: async () => {} },
    listProtectedPortsUseCase: { execute: async () => [] },
    listOutboundConnectionsUseCase: { execute: async () => [] },
    metrics: { recordTermination: () => {} },
    ...overrides,
  };

  const silentLogger = { info: () => {}, warn: () => {}, error: () => {} };
  const app = express();
  app.use(express.json());
  app.use('/api', createPortsRouter(useCases));
  app.use(createErrorHandler(silentLogger));
  return app;
}

describe('GET /api/ports', () => {
  it('returns the mapped port list', async () => {
    const app = buildApp({ listPortsUseCase: { execute: async () => [buildUsage(8080), buildUsage(3100)] } });

    const response = await request(app).get('/api/ports');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { port: 8080, protocol: 'TCP', pid: 1234, processName: 'node.exe', executablePath: null },
      { port: 3100, protocol: 'TCP', pid: 1234, processName: 'node.exe', executablePath: null },
    ]);
  });
});

describe('DELETE /api/ports/:port', () => {
  it('kills the process and returns the terminated event', async () => {
    const app = buildApp();

    const response = await request(app).delete('/api/ports/8080');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      port: 8080,
      protocol: 'TCP',
      pid: 1234,
      processName: 'node.exe',
      executablePath: null,
      occurredAt: '2026-07-29T12:00:00.000Z',
    });
  });

  it('records a termination metric on a successful kill', async () => {
    let recorded = 0;
    const app = buildApp({ metrics: { recordTermination: () => { recorded += 1; } } });

    await request(app).delete('/api/ports/8080');

    expect(recorded).toBe(1);
  });

  it('defaults protocol to TCP when not given as a query param', async () => {
    let receivedRequest;
    const app = buildApp({
      killPortUseCase: {
        execute: async (request_) => {
          receivedRequest = request_;
          return new ProcessTerminatedEvent(buildUsage(), new Date());
        },
      },
    });

    await request(app).delete('/api/ports/8080');

    expect(receivedRequest.protocol.value).toBe('TCP');
  });

  it('rejects a non-numeric port with 400', async () => {
    const app = buildApp();

    const response = await request(app).delete('/api/ports/not-a-number');

    expect(response.status).toBe(400);
  });

  it('rejects an out-of-range port with 400', async () => {
    const app = buildApp();

    const response = await request(app).delete('/api/ports/99999');

    expect(response.status).toBe(400);
  });

  it('maps ProtectedPortError to 403', async () => {
    const app = buildApp({
      killPortUseCase: {
        execute: async () => {
          throw new ProtectedPortError(new PortNumber(8080));
        },
      },
    });

    const response = await request(app).delete('/api/ports/8080');

    expect(response.status).toBe(403);
    expect(response.body.port).toBe(8080);
  });

  it('maps InsufficientPrivilegeError to 409 with a machine-readable code', async () => {
    const app = buildApp({
      killPortUseCase: {
        execute: async () => {
          throw new InsufficientPrivilegeError(new ProcessId(1234));
        },
      },
    });

    const response = await request(app).delete('/api/ports/8080');

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('INSUFFICIENT_PRIVILEGE');
  });

  it('maps an unexpected error to 500', async () => {
    const app = buildApp({
      killPortUseCase: {
        execute: async () => {
          throw new Error('boom');
        },
      },
    });

    const response = await request(app).delete('/api/ports/8080');

    expect(response.status).toBe(500);
  });
});

describe('GET /api/history', () => {
  it('returns the mapped history', async () => {
    const event = new ProcessTerminatedEvent(buildUsage(), new Date('2026-07-29T12:00:00.000Z'));
    const app = buildApp({ getPortHistoryUseCase: { execute: async () => [event] } });

    const response = await request(app).get('/api/history');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        port: 8080,
        protocol: 'TCP',
        pid: 1234,
        processName: 'node.exe',
        executablePath: null,
        occurredAt: '2026-07-29T12:00:00.000Z',
      },
    ]);
  });
});

describe('PUT /api/protection/:port', () => {
  it('protects a port and returns 204', async () => {
    const app = buildApp();

    const response = await request(app).put('/api/protection/5432');

    expect(response.status).toBe(204);
  });

  it('rejects a non-numeric port with 400', async () => {
    const app = buildApp();

    const response = await request(app).put('/api/protection/not-a-number');

    expect(response.status).toBe(400);
  });
});

describe('DELETE /api/protection/:port', () => {
  it('unprotects a port and returns 204', async () => {
    const app = buildApp();

    const response = await request(app).delete('/api/protection/5432');

    expect(response.status).toBe(204);
  });

  it('rejects a non-numeric port with 400', async () => {
    const app = buildApp();

    const response = await request(app).delete('/api/protection/not-a-number');

    expect(response.status).toBe(400);
  });
});

describe('GET /api/protection', () => {
  it('returns the list of protected port numbers', async () => {
    const app = buildApp({
      listProtectedPortsUseCase: { execute: async () => [new PortNumber(5432), new PortNumber(6379)] },
    });

    const response = await request(app).get('/api/protection');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([5432, 6379]);
  });
});

describe('GET /api/connections', () => {
  it('returns the mapped list of outbound connections', async () => {
    const connection = new OutboundConnection({
      localPort: new PortNumber(51234),
      protocol: new Protocol('TCP'),
      remoteAddress: '142.250.72.14',
      remotePort: new PortNumber(443),
      remoteHost: 'google.com',
      pid: new ProcessId(4112),
      processName: 'msedge.exe',
    });
    const app = buildApp({ listOutboundConnectionsUseCase: { execute: async () => [connection] } });

    const response = await request(app).get('/api/connections');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        localPort: 51234,
        protocol: 'TCP',
        remoteAddress: '142.250.72.14',
        remotePort: 443,
        remoteHost: 'google.com',
        pid: 4112,
        processName: 'msedge.exe',
        executablePath: null,
        remoteCountry: null,
        remoteCity: null,
      },
    ]);
  });
});
