const { SqlitePortHistoryRepositoryAdapter } = require('../../../../../src/adapters/driven/persistence/SqlitePortHistoryRepositoryAdapter');
const { ProcessTerminatedEvent } = require('../../../../../src/domain/events/ProcessTerminatedEvent');
const { PortUsage } = require('../../../../../src/domain/entities/PortUsage');
const { PortNumber } = require('../../../../../src/domain/value-objects/PortNumber');
const { Protocol } = require('../../../../../src/domain/value-objects/Protocol');
const { ProcessId } = require('../../../../../src/domain/value-objects/ProcessId');

function buildEvent(portNumber, occurredAt) {
  const usage = new PortUsage({
    portNumber: new PortNumber(portNumber),
    protocol: new Protocol('TCP'),
    pid: new ProcessId(1234),
    processName: 'node.exe',
  });

  return new ProcessTerminatedEvent(usage, occurredAt);
}

describe('SqlitePortHistoryRepositoryAdapter', () => {
  it('starts empty', async () => {
    const repository = new SqlitePortHistoryRepositoryAdapter();

    expect(await repository.findAll()).toEqual([]);
  });

  it('saves an event and reads it back with the same data', async () => {
    const repository = new SqlitePortHistoryRepositoryAdapter();
    const event = buildEvent(8080, new Date('2026-07-29T12:00:00.000Z'));

    await repository.save(event);
    const [found] = await repository.findAll();

    expect(found.portUsage.portNumber.value).toBe(8080);
    expect(found.portUsage.protocol.value).toBe('TCP');
    expect(found.portUsage.pid.value).toBe(1234);
    expect(found.portUsage.processName).toBe('node.exe');
    expect(found.occurredAt.toISOString()).toBe('2026-07-29T12:00:00.000Z');
  });

  it('returns events in the order they were saved', async () => {
    const repository = new SqlitePortHistoryRepositoryAdapter();

    await repository.save(buildEvent(8080, new Date('2026-07-29T12:00:00.000Z')));
    await repository.save(buildEvent(3000, new Date('2026-07-29T12:05:00.000Z')));

    const events = await repository.findAll();

    expect(events.map((event) => event.portUsage.portNumber.value)).toEqual([8080, 3000]);
  });
});
