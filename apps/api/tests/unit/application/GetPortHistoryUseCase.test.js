const { GetPortHistoryUseCase } = require('../../../src/application/use-cases/GetPortHistoryUseCase');
const { PortHistoryRepositoryPort } = require('../../../src/domain/ports/outbound/PortHistoryRepositoryPort');
const { ProcessTerminatedEvent } = require('../../../src/domain/events/ProcessTerminatedEvent');
const { PortUsage } = require('../../../src/domain/entities/PortUsage');
const { PortNumber } = require('../../../src/domain/value-objects/PortNumber');
const { Protocol } = require('../../../src/domain/value-objects/Protocol');
const { ProcessId } = require('../../../src/domain/value-objects/ProcessId');

class FakePortHistoryRepositoryAdapter extends PortHistoryRepositoryPort {
  constructor(events) {
    super();
    this.events = events;
  }

  async findAll() {
    return this.events;
  }
}

function buildEvent() {
  const usage = new PortUsage({
    portNumber: new PortNumber(8080),
    protocol: new Protocol('TCP'),
    pid: new ProcessId(1234),
    processName: 'node.exe',
  });

  return new ProcessTerminatedEvent(usage, new Date('2026-07-29T12:00:00.000Z'));
}

describe('GetPortHistoryUseCase', () => {
  it('returns whatever the PortHistoryRepositoryPort reports', async () => {
    const events = [buildEvent()];
    const useCase = new GetPortHistoryUseCase(new FakePortHistoryRepositoryAdapter(events));

    const result = await useCase.execute();

    expect(result).toBe(events);
  });

  it('returns an empty list when there is no history yet', async () => {
    const useCase = new GetPortHistoryUseCase(new FakePortHistoryRepositoryAdapter([]));

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });

  it('rejects a dependency that is not a PortHistoryRepositoryPort', () => {
    expect(() => new GetPortHistoryUseCase({ findAll: async () => [] })).toThrow();
  });
});
