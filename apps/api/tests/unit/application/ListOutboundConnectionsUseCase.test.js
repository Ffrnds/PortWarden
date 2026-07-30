const { ListOutboundConnectionsUseCase } = require('../../../src/application/use-cases/ListOutboundConnectionsUseCase');
const { PortInspectorPort } = require('../../../src/domain/ports/outbound/PortInspectorPort');
const { OutboundConnection } = require('../../../src/domain/entities/OutboundConnection');
const { PortNumber } = require('../../../src/domain/value-objects/PortNumber');
const { Protocol } = require('../../../src/domain/value-objects/Protocol');
const { ProcessId } = require('../../../src/domain/value-objects/ProcessId');

class FakePortInspectorAdapter extends PortInspectorPort {
  constructor(connections) {
    super();
    this.connections = connections;
  }

  async listOutboundConnections() {
    return this.connections;
  }
}

function buildConnection() {
  return new OutboundConnection({
    localPort: new PortNumber(51234),
    protocol: new Protocol('TCP'),
    remoteAddress: '142.250.72.14',
    remotePort: new PortNumber(443),
    pid: new ProcessId(4112),
    processName: 'msedge.exe',
  });
}

describe('ListOutboundConnectionsUseCase', () => {
  it('returns whatever the PortInspectorPort reports', async () => {
    const connections = [buildConnection()];
    const useCase = new ListOutboundConnectionsUseCase(new FakePortInspectorAdapter(connections));

    expect(await useCase.execute()).toBe(connections);
  });

  it('returns an empty list when there are no established connections', async () => {
    const useCase = new ListOutboundConnectionsUseCase(new FakePortInspectorAdapter([]));

    expect(await useCase.execute()).toEqual([]);
  });

  it('rejects a dependency that is not a PortInspectorPort', () => {
    expect(() => new ListOutboundConnectionsUseCase({ listOutboundConnections: async () => [] })).toThrow();
  });
});
