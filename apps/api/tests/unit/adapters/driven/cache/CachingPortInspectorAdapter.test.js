const { CachingPortInspectorAdapter } = require('../../../../../src/adapters/driven/cache/CachingPortInspectorAdapter');
const { CachePort } = require('../../../../../src/domain/ports/outbound/CachePort');
const { PortInspectorPort } = require('../../../../../src/domain/ports/outbound/PortInspectorPort');
const { PortUsage } = require('../../../../../src/domain/entities/PortUsage');
const { OutboundConnection } = require('../../../../../src/domain/entities/OutboundConnection');
const { PortNumber } = require('../../../../../src/domain/value-objects/PortNumber');
const { Protocol } = require('../../../../../src/domain/value-objects/Protocol');
const { ProcessId } = require('../../../../../src/domain/value-objects/ProcessId');

class FakeCachePort extends CachePort {
  #store = new Map();

  async get(key) {
    return this.#store.get(key) ?? null;
  }

  async set(key, value) {
    this.#store.set(key, value);
  }
}

class CountingPortInspectorAdapter extends PortInspectorPort {
  constructor(usages, connections) {
    super();
    this.usages = usages;
    this.connections = connections;
    this.listActivePortsCalls = 0;
    this.listOutboundConnectionsCalls = 0;
  }

  async listActivePorts() {
    this.listActivePortsCalls += 1;
    return this.usages;
  }

  async listOutboundConnections() {
    this.listOutboundConnectionsCalls += 1;
    return this.connections;
  }
}

function buildUsage(port) {
  return new PortUsage({
    portNumber: new PortNumber(port),
    protocol: new Protocol('TCP'),
    pid: new ProcessId(1234),
    processName: 'node.exe',
    executablePath: 'C:\\node.exe',
  });
}

function buildConnection(remotePort) {
  return new OutboundConnection({
    localPort: new PortNumber(51234),
    protocol: new Protocol('TCP'),
    remoteAddress: '203.0.113.5',
    remotePort: new PortNumber(remotePort),
    pid: new ProcessId(4112),
    processName: 'msedge.exe',
    remoteHost: 'example.com',
    remoteCountry: 'US',
    remoteCity: 'Ashburn',
  });
}

describe('CachingPortInspectorAdapter', () => {
  it('calls through to the inner adapter on the first listActivePorts() call', async () => {
    const inner = new CountingPortInspectorAdapter([buildUsage(8080)], []);
    const adapter = new CachingPortInspectorAdapter(inner, new FakeCachePort());

    const result = await adapter.listActivePorts();

    expect(inner.listActivePortsCalls).toBe(1);
    expect(result[0].portNumber.value).toBe(8080);
  });

  it('serves the second listActivePorts() call from the cache without calling the inner adapter again', async () => {
    const inner = new CountingPortInspectorAdapter([buildUsage(8080)], []);
    const adapter = new CachingPortInspectorAdapter(inner, new FakeCachePort());

    await adapter.listActivePorts();
    const second = await adapter.listActivePorts();

    expect(inner.listActivePortsCalls).toBe(1);
    expect(second[0]).toBeInstanceOf(PortUsage);
    expect(second[0].portNumber.value).toBe(8080);
    expect(second[0].executablePath).toBe('C:\\node.exe');
  });

  it('serves the second listOutboundConnections() call from the cache, reconstructing every field', async () => {
    const inner = new CountingPortInspectorAdapter([], [buildConnection(443)]);
    const adapter = new CachingPortInspectorAdapter(inner, new FakeCachePort());

    await adapter.listOutboundConnections();
    const [connection] = await adapter.listOutboundConnections();

    expect(inner.listOutboundConnectionsCalls).toBe(1);
    expect(connection).toBeInstanceOf(OutboundConnection);
    expect(connection.remoteAddress).toBe('203.0.113.5');
    expect(connection.remoteHost).toBe('example.com');
    expect(connection.remoteCountry).toBe('US');
    expect(connection.remoteCity).toBe('Ashburn');
  });

  it('invalidate() forces the next listActivePorts() call to hit the inner adapter again', async () => {
    const inner = new CountingPortInspectorAdapter([buildUsage(8080)], []);
    const adapter = new CachingPortInspectorAdapter(inner, new FakeCachePort());

    await adapter.listActivePorts();
    await adapter.invalidate();
    await adapter.listActivePorts();

    expect(inner.listActivePortsCalls).toBe(2);
  });

  it('invalidate() forces the next listOutboundConnections() call to hit the inner adapter again', async () => {
    const inner = new CountingPortInspectorAdapter([], [buildConnection(443)]);
    const adapter = new CachingPortInspectorAdapter(inner, new FakeCachePort());

    await adapter.listOutboundConnections();
    await adapter.invalidate();
    await adapter.listOutboundConnections();

    expect(inner.listOutboundConnectionsCalls).toBe(2);
  });

  it('keeps the listActivePorts and listOutboundConnections caches independent', async () => {
    const inner = new CountingPortInspectorAdapter([buildUsage(8080)], [buildConnection(443)]);
    const adapter = new CachingPortInspectorAdapter(inner, new FakeCachePort());

    await adapter.listActivePorts();
    await adapter.listOutboundConnections();

    expect(inner.listActivePortsCalls).toBe(1);
    expect(inner.listOutboundConnectionsCalls).toBe(1);
  });
});
