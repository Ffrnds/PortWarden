const { PortUsage } = require('../../../src/domain/entities/PortUsage');
const { PortNumber } = require('../../../src/domain/value-objects/PortNumber');
const { Protocol } = require('../../../src/domain/value-objects/Protocol');
const { ProcessId } = require('../../../src/domain/value-objects/ProcessId');

function buildPortUsage(overrides = {}) {
  return new PortUsage({
    portNumber: new PortNumber(8080),
    protocol: new Protocol('TCP'),
    pid: new ProcessId(1234),
    processName: 'node.exe',
    ...overrides,
  });
}

describe('PortUsage', () => {
  it('creates a valid port usage', () => {
    const usage = buildPortUsage();

    expect(usage.portNumber.value).toBe(8080);
    expect(usage.protocol.value).toBe('TCP');
    expect(usage.pid.value).toBe(1234);
    expect(usage.processName).toBe('node.exe');
    expect(usage.executablePath).toBeNull();
  });

  it('accepts an optional executable path', () => {
    const usage = buildPortUsage({ executablePath: 'C:\\Program Files\\nodejs\\node.exe' });

    expect(usage.executablePath).toBe('C:\\Program Files\\nodejs\\node.exe');
  });

  it('rejects a non-string, non-null executablePath', () => {
    expect(() => buildPortUsage({ executablePath: 123 })).toThrow();
  });

  it('rejects raw primitives instead of value objects', () => {
    expect(() => buildPortUsage({ portNumber: 8080 })).toThrow();
    expect(() => buildPortUsage({ protocol: 'TCP' })).toThrow();
    expect(() => buildPortUsage({ pid: 1234 })).toThrow();
  });

  it('rejects an empty process name', () => {
    expect(() => buildPortUsage({ processName: '' })).toThrow();
    expect(() => buildPortUsage({ processName: '   ' })).toThrow();
  });

  it('identifies itself by port + protocol + pid', () => {
    const usage = buildPortUsage();

    expect(usage.id).toBe('8080/TCP/1234');
  });

  it('is equal to another instance with the same identity, regardless of other fields', () => {
    const a = buildPortUsage({ processName: 'node.exe' });
    const b = buildPortUsage({ processName: 'node (renamed by OS).exe' });

    expect(a.equals(b)).toBe(true);
  });

  it('is not equal when port, protocol, or pid differ', () => {
    const base = buildPortUsage();

    expect(base.equals(buildPortUsage({ portNumber: new PortNumber(9090) }))).toBe(false);
    expect(base.equals(buildPortUsage({ protocol: new Protocol('UDP') }))).toBe(false);
    expect(base.equals(buildPortUsage({ pid: new ProcessId(9999) }))).toBe(false);
  });
});
