const { WebSocketServer } = require('ws');
const { PortMapper } = require('../../../application/mappers/PortMapper');
const { OutboundConnectionMapper } = require('../../../application/mappers/OutboundConnectionMapper');
const { AlertMapper } = require('../../../application/mappers/AlertMapper');

// Express-native equivalent of @nestjs/websockets: rather than every client
// polling GET /api/ports on its own 5s timer, this pushes one shared
// snapshot to every connected client on an interval, plus immediately to
// any client that just connected. apps/web still falls back to its old
// polling loop if the socket never connects or drops (see
// apps/web/src/realtime/portsSocket.js) — this augments the REST API, it
// doesn't replace it.
async function buildSnapshotMessage({ listPortsUseCase, listOutboundConnectionsUseCase, listProtectedPortsUseCase, detectSuspiciousActivityUseCase }) {
  const [ports, connections, protectedPorts, alerts] = await Promise.all([
    listPortsUseCase.execute(),
    listOutboundConnectionsUseCase.execute(),
    listProtectedPortsUseCase.execute(),
    detectSuspiciousActivityUseCase.execute(),
  ]);

  return JSON.stringify({
    type: 'snapshot',
    ports: PortMapper.toDTOList(ports),
    connections: OutboundConnectionMapper.toDTOList(connections),
    protectedPorts: protectedPorts.map((portNumber) => portNumber.value),
    alerts: AlertMapper.toDTOList(alerts),
  });
}

function createPortsWebSocketServer(
  httpServer,
  { listPortsUseCase, listOutboundConnectionsUseCase, listProtectedPortsUseCase, detectSuspiciousActivityUseCase, logger, intervalMs = 5000 }
) {
  const useCases = { listPortsUseCase, listOutboundConnectionsUseCase, listProtectedPortsUseCase, detectSuspiciousActivityUseCase };
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  async function broadcastSnapshot() {
    // No point paying for a real netstat/tasklist round trip if nobody's
    // listening — the whole point of push over polling is not doing
    // unnecessary work.
    if (wss.clients.size === 0) {
      return;
    }

    try {
      const message = await buildSnapshotMessage(useCases);
      wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send(message);
        }
      });
    } catch (error) {
      logger.error('Failed to build WebSocket snapshot', { stack: error.stack });
    }
  }

  wss.on('connection', async (socket) => {
    try {
      socket.send(await buildSnapshotMessage(useCases));
    } catch (error) {
      logger.error('Failed to send initial WebSocket snapshot', { stack: error.stack });
    }
  });

  const interval = setInterval(broadcastSnapshot, intervalMs);

  return {
    close() {
      clearInterval(interval);
      wss.clients.forEach((client) => client.terminate());
      wss.close();
    },
  };
}

module.exports = { createPortsWebSocketServer, buildSnapshotMessage };
