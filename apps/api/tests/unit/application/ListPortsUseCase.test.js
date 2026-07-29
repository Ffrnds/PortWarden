const { ListPortsUseCase } = require('../../../src/application/use-cases/ListPortsUseCase');
const { PortInspectorPort } = require('../../../src/domain/ports/outbound/PortInspectorPort');
const { PortUsage } = require('../../../src/domain/entities/PortUsage');
const { PortNumber } = require('../../../src/domain/value-objects/PortNumber');
const { Protocol } = require('../../../src/domain/value-objects/Protocol');
const { ProcessId } = require('../../../src/domain/value-objects/ProcessId');

class FakePortInspectorAdapter extends PortInspectorPort {
  constructor(activePorts) {
    super();
    this.activePorts = activePorts;
  }

  async listActivePorts() {
    return this.activePorts;
  }
}

function buildPortUsage(portNumber, pid = 1234) {
  return new PortUsage({
    portNumber: new PortNumber(portNumber),
    protocol: new Protocol('TCP'),
    pid: new ProcessId(pid),
    processName: 'node.exe',
  });
}

describe('ListPortsUseCase', () => {
  it('returns what the PortInspectorPort reports', async () => {
    const usages = [buildPortUsage(8080), buildPortUsage(3000)];
    const useCase = new ListPortsUseCase(new FakePortInspectorAdapter(usages));

    const result = await useCase.execute();

    expect(result.map((usage) => usage.id)).toEqual(usages.map((usage) => usage.id));
  });

  it('de-duplicates entries with the same identity reported by the inspector', async () => {
    const duplicated = buildPortUsage(8080);
    const useCase = new ListPortsUseCase(new FakePortInspectorAdapter([duplicated, duplicated, buildPortUsage(3000)]));

    const result = await useCase.execute();

    expect(result).toHaveLength(2);
  });

  it('returns an empty list when no port is active', async () => {
    const useCase = new ListPortsUseCase(new FakePortInspectorAdapter([]));

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });

  it('rejects a dependency that is not a PortInspectorPort', () => {
    expect(() => new ListPortsUseCase({ listActivePorts: async () => [] })).toThrow();
  });
});
