const http = require('node:http');
const WebSocket = require('ws');
const { createPortsWebSocketServer } = require('../../src/adapters/driving/websocket/createPortsWebSocketServer');

// Real http.Server + real `ws` client, same reasoning as the rest of this
// project's I/O-touching adapters: the WebSocket upgrade handshake is
// exactly the kind of thing that's easy to get subtly wrong and a mock
// would happily paper over.
function buildUseCases(overrides = {}) {
  return {
    listPortsUseCase: { execute: async () => [] },
    listOutboundConnectionsUseCase: { execute: async () => [] },
    listProtectedPortsUseCase: { execute: async () => [] },
    detectSuspiciousActivityUseCase: { execute: async () => [] },
    logger: { error: () => {} },
    ...overrides,
  };
}

async function startServer(useCaseOverrides = {}, wsOverrides = {}) {
  const httpServer = http.createServer();
  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const port = httpServer.address().port;
  const wsHandle = createPortsWebSocketServer(httpServer, { ...buildUseCases(useCaseOverrides), ...wsOverrides });

  return {
    port,
    async close() {
      wsHandle.close();
      await new Promise((resolve) => httpServer.close(resolve));
    },
  };
}

function nextMessage(socket) {
  return new Promise((resolve, reject) => {
    socket.once('message', (data) => resolve(JSON.parse(data)));
    socket.once('error', reject);
  });
}

describe('createPortsWebSocketServer', () => {
  it('sends an initial snapshot to a newly connected client', async () => {
    const server = await startServer();

    try {
      const socket = new WebSocket(`ws://127.0.0.1:${server.port}/ws`);
      const message = await nextMessage(socket);

      expect(message).toEqual({ type: 'snapshot', ports: [], connections: [], protectedPorts: [], alerts: [] });
      socket.close();
    } finally {
      await server.close();
    }
  }, 10000);

  it('broadcasts a fresh snapshot to connected clients on the interval', async () => {
    const server = await startServer({}, { intervalMs: 50 });

    try {
      const socket = new WebSocket(`ws://127.0.0.1:${server.port}/ws`);
      await nextMessage(socket); // the immediate on-connect snapshot
      const second = await nextMessage(socket); // the first interval tick

      expect(second.type).toBe('snapshot');
      socket.close();
    } finally {
      await server.close();
    }
  }, 10000);

  it('does not call the use cases on a tick when no client is connected', async () => {
    let calls = 0;
    const listPortsUseCase = {
      execute: async () => {
        calls += 1;
        return [];
      },
    };
    const server = await startServer({ listPortsUseCase }, { intervalMs: 30 });

    try {
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(calls).toBe(0);
    } finally {
      await server.close();
    }
  }, 10000);
});
