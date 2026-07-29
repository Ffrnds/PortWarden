const { InMemoryObservabilityGateway } = require('../../../../../src/adapters/driven/gateways/InMemoryObservabilityGateway');
const { ProcessTerminatedEvent } = require('../../../../../src/domain/events/ProcessTerminatedEvent');
const { PortUsage } = require('../../../../../src/domain/entities/PortUsage');
const { PortNumber } = require('../../../../../src/domain/value-objects/PortNumber');
const { Protocol } = require('../../../../../src/domain/value-objects/Protocol');
const { ProcessId } = require('../../../../../src/domain/value-objects/ProcessId');

function buildEvent() {
  const usage = new PortUsage({
    portNumber: new PortNumber(8080),
    protocol: new Protocol('TCP'),
    pid: new ProcessId(1234),
    processName: 'node.exe',
  });
  return new ProcessTerminatedEvent(usage);
}

describe('InMemoryObservabilityGateway', () => {
  it('starts empty', () => {
    expect(new InMemoryObservabilityGateway().list()).toEqual([]);
  });

  it('records an event', async () => {
    const gateway = new InMemoryObservabilityGateway();
    const event = buildEvent();

    await gateway.recordEvent(event);

    expect(gateway.list()).toEqual([event]);
  });

  it('list() returns a defensive copy', async () => {
    const gateway = new InMemoryObservabilityGateway();
    await gateway.recordEvent(buildEvent());

    gateway.list().push(buildEvent());

    expect(gateway.list()).toHaveLength(1);
  });
});
