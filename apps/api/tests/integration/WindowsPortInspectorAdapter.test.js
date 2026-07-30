const http = require('node:http');
const net = require('node:net');
const { WindowsPortInspectorAdapter } = require('../../src/adapters/driven/os/WindowsPortInspectorAdapter');

// Unlike everything tested so far, this test deliberately DOES touch the
// real OS: it spins up a real HTTP server on an OS-assigned port, then asks
// the adapter to run real `netstat`/PowerShell commands and confirms our own
// test process shows up LISTENING on that exact port.
describe('WindowsPortInspectorAdapter (integration)', () => {
  it('finds a real TCP listener started by this test process', async () => {
    const server = http.createServer();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;

    try {
      const adapter = new WindowsPortInspectorAdapter();
      const usages = await adapter.listActivePorts();

      const usage = usages.find(
        (candidate) => candidate.portNumber.value === port && candidate.protocol.value === 'TCP'
      );

      expect(usage).toBeDefined();
      expect(usage.pid.value).toBe(process.pid);
      expect(usage.processName.toLowerCase()).toContain('node');
      expect(usage.executablePath.toLowerCase()).toContain('node');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  }, 15000);

  it('finds a real established loopback connection this test process opened', async () => {
    const server = net.createServer((socket) => socket.on('data', () => {}));
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const serverPort = server.address().port;

    const client = net.connect({ host: '127.0.0.1', port: serverPort });
    await new Promise((resolve) => client.once('connect', resolve));

    try {
      const adapter = new WindowsPortInspectorAdapter();
      const connections = await adapter.listOutboundConnections();

      const connection = connections.find(
        (candidate) => candidate.localPort.value === client.localPort && candidate.remotePort.value === serverPort
      );

      expect(connection).toBeDefined();
      expect(connection.remoteAddress).toBe('127.0.0.1');
      expect(connection.pid.value).toBe(process.pid);
      // Loopback addresses rarely have a useful PTR record — this just
      // proves the field exists and doesn't blow up, not that it resolves.
      expect(connection).toHaveProperty('remoteHost');
    } finally {
      client.destroy();
      await new Promise((resolve) => server.close(resolve));
    }
  }, 15000);
});
