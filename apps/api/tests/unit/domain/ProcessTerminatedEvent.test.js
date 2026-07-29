const { ProcessTerminatedEvent } = require('../../../src/domain/events/ProcessTerminatedEvent');
const { PortUsage } = require('../../../src/domain/entities/PortUsage');
const { PortNumber } = require('../../../src/domain/value-objects/PortNumber');
const { Protocol } = require('../../../src/domain/value-objects/Protocol');
const { ProcessId } = require('../../../src/domain/value-objects/ProcessId');

function buildPortUsage() {
  return new PortUsage({
    portNumber: new PortNumber(8080),
    protocol: new Protocol('TCP'),
    pid: new ProcessId(1234),
    processName: 'node.exe',
  });
}

describe('ProcessTerminatedEvent', () => {
  it('carries the terminated port usage and an explicit timestamp', () => {
    const usage = buildPortUsage();
    const fixedTimestamp = new Date('2026-07-29T12:00:00.000Z');

    const event = new ProcessTerminatedEvent(usage, fixedTimestamp);

    expect(event.portUsage).toBe(usage);
    expect(event.occurredAt).toBe(fixedTimestamp);
  });

  it('defaults occurredAt to the current time when not provided', () => {
    const before = new Date();
    const event = new ProcessTerminatedEvent(buildPortUsage());
    const after = new Date();

    expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(event.occurredAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('rejects a portUsage that is not a PortUsage instance', () => {
    expect(() => new ProcessTerminatedEvent({ id: '8080/TCP/1234' })).toThrow();
  });

  it('rejects an invalid occurredAt', () => {
    expect(() => new ProcessTerminatedEvent(buildPortUsage(), new Date('not-a-date'))).toThrow();
    expect(() => new ProcessTerminatedEvent(buildPortUsage(), 'not-a-date')).toThrow();
  });

  it('is immutable', () => {
    const event = new ProcessTerminatedEvent(buildPortUsage());

    expect(() => {
      event.occurredAt = new Date();
    }).toThrow();
  });
});
