const { OutboundConnection } = require('../../../src/domain/entities/OutboundConnection');
const { PortNumber } = require('../../../src/domain/value-objects/PortNumber');
const { Protocol } = require('../../../src/domain/value-objects/Protocol');
const { ProcessId } = require('../../../src/domain/value-objects/ProcessId');

function buildConnection(overrides = {}) {
  return new OutboundConnection({
    localPort: new PortNumber(51234),
    protocol: new Protocol('TCP'),
    remoteAddress: '142.250.72.14',
    remotePort: new PortNumber(443),
    pid: new ProcessId(4112),
    processName: 'msedge.exe',
    ...overrides,
  });
}

describe('OutboundConnection', () => {
  it('creates a valid outbound connection with no remote host by default', () => {
    const connection = buildConnection();

    expect(connection.localPort.value).toBe(51234);
    expect(connection.remoteAddress).toBe('142.250.72.14');
    expect(connection.remotePort.value).toBe(443);
    expect(connection.pid.value).toBe(4112);
    expect(connection.processName).toBe('msedge.exe');
    expect(connection.remoteHost).toBeNull();
    expect(connection.executablePath).toBeNull();
    expect(connection.remoteCountry).toBeNull();
    expect(connection.remoteCity).toBeNull();
  });

  it('rejects raw primitives instead of value objects', () => {
    expect(() => buildConnection({ localPort: 51234 })).toThrow();
    expect(() => buildConnection({ remotePort: 443 })).toThrow();
    expect(() => buildConnection({ pid: 4112 })).toThrow();
  });

  it('rejects an empty remote address', () => {
    expect(() => buildConnection({ remoteAddress: '' })).toThrow();
  });

  it('withRemoteHost returns a new instance with the resolved hostname, leaving the original untouched', () => {
    const original = buildConnection();
    const resolved = original.withRemoteHost('lclgaa-aw-in-f14.1e100.net');

    expect(original.remoteHost).toBeNull();
    expect(resolved.remoteHost).toBe('lclgaa-aw-in-f14.1e100.net');
    expect(resolved.localPort).toBe(original.localPort);
    expect(resolved.remoteAddress).toBe(original.remoteAddress);
  });

  it('withGeoLocation returns a new instance with the resolved country/city, leaving the original untouched', () => {
    const original = buildConnection();
    const resolved = original.withGeoLocation({ country: 'US', city: 'Ashburn' });

    expect(original.remoteCountry).toBeNull();
    expect(original.remoteCity).toBeNull();
    expect(resolved.remoteCountry).toBe('US');
    expect(resolved.remoteCity).toBe('Ashburn');
    expect(resolved.localPort).toBe(original.localPort);
  });

  it('withGeoLocation preserves an already-resolved remote host', () => {
    const withHost = buildConnection().withRemoteHost('example.com');
    const resolved = withHost.withGeoLocation({ country: 'US', city: 'Ashburn' });

    expect(resolved.remoteHost).toBe('example.com');
    expect(resolved.remoteCountry).toBe('US');
  });

  it('is immutable', () => {
    const connection = buildConnection();

    expect(() => {
      connection.remoteHost = 'tampered';
    }).toThrow();
  });
});
