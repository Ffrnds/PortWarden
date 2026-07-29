const http = require('node:http');
const { WindowsPortInspectorAdapter } = require('../../src/adapters/driven/os/WindowsPortInspectorAdapter');

// Unlike everything tested so far, this test deliberately DOES touch the
// real OS: it spins up a real HTTP server on an OS-assigned port, then asks
// the adapter to run real `netstat`/`tasklist` commands and confirms our own
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
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  }, 15000);
});
