const { DetectSuspiciousActivityUseCase } = require('../../../src/application/use-cases/DetectSuspiciousActivityUseCase');
const { PortInspectorPort } = require('../../../src/domain/ports/outbound/PortInspectorPort');
const { NotifierPort } = require('../../../src/domain/ports/outbound/NotifierPort');
const { PortUsage } = require('../../../src/domain/entities/PortUsage');
const { OutboundConnection } = require('../../../src/domain/entities/OutboundConnection');
const { PortNumber } = require('../../../src/domain/value-objects/PortNumber');
const { Protocol } = require('../../../src/domain/value-objects/Protocol');
const { ProcessId } = require('../../../src/domain/value-objects/ProcessId');

class FakePortInspectorAdapter extends PortInspectorPort {
  constructor(usages = [], connections = []) {
    super();
    this.usages = usages;
    this.connections = connections;
  }

  async listActivePorts() {
    return this.usages;
  }

  async listOutboundConnections() {
    return this.connections;
  }
}

class FakeNotifierAdapter extends NotifierPort {
  constructor() {
    super();
    this.notified = [];
  }

  async notify(message) {
    this.notified.push(message);
  }
}

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

describe('DetectSuspiciousActivityUseCase', () => {
  it('returns no alerts when nothing matches the policy', async () => {
    const portInspector = new FakePortInspectorAdapter([buildPortUsage(8080)], [buildConnection(443)]);
    const useCase = new DetectSuspiciousActivityUseCase(portInspector, new FakeNotifierAdapter());

    expect(await useCase.execute()).toEqual([]);
  });

  it('flags a suspicious listening port', async () => {
    const portInspector = new FakePortInspectorAdapter([buildPortUsage(31337)], []);
    const useCase = new DetectSuspiciousActivityUseCase(portInspector, new FakeNotifierAdapter());

    const alerts = await useCase.execute();

    expect(alerts).toHaveLength(1);
    expect(alerts[0].kind).toBe('listening');
    expect(alerts[0].reasons[0]).toContain('31337');
  });

  it('flags a suspicious outbound connection', async () => {
    const portInspector = new FakePortInspectorAdapter([], [buildConnection(4444)]);
    const useCase = new DetectSuspiciousActivityUseCase(portInspector, new FakeNotifierAdapter());

    const alerts = await useCase.execute();

    expect(alerts).toHaveLength(1);
    expect(alerts[0].kind).toBe('outbound');
  });

  it('notifies once per newly-detected alert', async () => {
    const portInspector = new FakePortInspectorAdapter([buildPortUsage(31337)], []);
    const notifier = new FakeNotifierAdapter();
    const useCase = new DetectSuspiciousActivityUseCase(portInspector, notifier);

    await useCase.execute();

    expect(notifier.notified).toHaveLength(1);
  });

  it('does not re-notify for the same alert on a later call', async () => {
    const portInspector = new FakePortInspectorAdapter([buildPortUsage(31337)], []);
    const notifier = new FakeNotifierAdapter();
    const useCase = new DetectSuspiciousActivityUseCase(portInspector, notifier);

    await useCase.execute();
    await useCase.execute();

    expect(notifier.notified).toHaveLength(1);
  });

  it('does not let a notifier failure break the response', async () => {
    const portInspector = new FakePortInspectorAdapter([buildPortUsage(31337)], []);
    const notifier = new FakeNotifierAdapter();
    notifier.notify = async () => {
      throw new Error('toast failed');
    };
    const useCase = new DetectSuspiciousActivityUseCase(portInspector, notifier);

    const alerts = await useCase.execute();

    expect(alerts).toHaveLength(1);
  });

  it('rejects a portInspector that is not a PortInspectorPort', () => {
    expect(() => new DetectSuspiciousActivityUseCase({}, new FakeNotifierAdapter())).toThrow();
  });

  it('rejects a notifier that is not a NotifierPort', () => {
    const portInspector = new FakePortInspectorAdapter([], []);
    expect(() => new DetectSuspiciousActivityUseCase(portInspector, {})).toThrow();
  });
});
