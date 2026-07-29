const { PortUsageAggregate } = require('../../../src/domain/aggregates/PortUsageAggregate');
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

describe('PortUsageAggregate', () => {
  it('starts empty', () => {
    const aggregate = new PortUsageAggregate();

    expect(aggregate.size).toBe(0);
    expect(aggregate.list()).toEqual([]);
  });

  it('adds a port usage', () => {
    const aggregate = new PortUsageAggregate();
    const usage = buildPortUsage();

    aggregate.add(usage);

    expect(aggregate.size).toBe(1);
    expect(aggregate.findById(usage.id)).toBe(usage);
  });

  it('rejects adding a duplicate identity', () => {
    const aggregate = new PortUsageAggregate();
    aggregate.add(buildPortUsage());

    expect(() => aggregate.add(buildPortUsage({ processName: 'other.exe' }))).toThrow();
  });

  it('rejects adding something that is not a PortUsage', () => {
    const aggregate = new PortUsageAggregate();

    expect(() => aggregate.add({ id: '8080/TCP/1234' })).toThrow();
  });

  it('removes a port usage by id', () => {
    const aggregate = new PortUsageAggregate();
    const usage = buildPortUsage();
    aggregate.add(usage);

    aggregate.remove(usage.id);

    expect(aggregate.size).toBe(0);
    expect(aggregate.findById(usage.id)).toBeNull();
  });

  it('throws when removing an id that does not exist', () => {
    const aggregate = new PortUsageAggregate();

    expect(() => aggregate.remove('9999/TCP/1')).toThrow();
  });

  it('list() returns a defensive copy, not the internal array', () => {
    const aggregate = new PortUsageAggregate();
    aggregate.add(buildPortUsage());

    const externalList = aggregate.list();
    externalList.push(buildPortUsage({ portNumber: new PortNumber(9090) }));

    expect(aggregate.size).toBe(1);
  });
});
