const { SuspiciousActivityPolicy } = require('../../../src/domain/services/SuspiciousActivityPolicy');
const { PortUsage } = require('../../../src/domain/entities/PortUsage');
const { OutboundConnection } = require('../../../src/domain/entities/OutboundConnection');
const { PortNumber } = require('../../../src/domain/value-objects/PortNumber');
const { Protocol } = require('../../../src/domain/value-objects/Protocol');
const { ProcessId } = require('../../../src/domain/value-objects/ProcessId');

function buildPortUsage(portNumber) {
  return new PortUsage({
    portNumber: new PortNumber(portNumber),
    protocol: new Protocol('TCP'),
    pid: new ProcessId(1234),
    processName: 'node.exe',
  });
}

function buildConnection(remotePort) {
  return new OutboundConnection({
    localPort: new PortNumber(51234),
    protocol: new Protocol('TCP'),
    remoteAddress: '203.0.113.5',
    remotePort: new PortNumber(remotePort),
    pid: new ProcessId(4112),
    processName: 'node.exe',
  });
}

describe('SuspiciousActivityPolicy.evaluatePortUsage', () => {
  it('returns no reasons for an ordinary port', () => {
    expect(SuspiciousActivityPolicy.evaluatePortUsage(buildPortUsage(8080))).toEqual([]);
  });

  it('flags a well-known backdoor/malware port', () => {
    const reasons = SuspiciousActivityPolicy.evaluatePortUsage(buildPortUsage(31337));

    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toContain('31337');
  });
});

describe('SuspiciousActivityPolicy.evaluateConnection', () => {
  it('returns no reasons for an ordinary remote port', () => {
    expect(SuspiciousActivityPolicy.evaluateConnection(buildConnection(443))).toEqual([]);
  });

  it('flags a connection to a well-known backdoor/malware port', () => {
    const reasons = SuspiciousActivityPolicy.evaluateConnection(buildConnection(4444));

    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toContain('4444');
  });
});
