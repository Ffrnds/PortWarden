const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { SqlitePortHistoryRepositoryAdapter } = require('../../src/adapters/driven/persistence/SqlitePortHistoryRepositoryAdapter');
const { ProcessTerminatedEvent } = require('../../src/domain/events/ProcessTerminatedEvent');
const { PortUsage } = require('../../src/domain/entities/PortUsage');
const { PortNumber } = require('../../src/domain/value-objects/PortNumber');
const { Protocol } = require('../../src/domain/value-objects/Protocol');
const { ProcessId } = require('../../src/domain/value-objects/ProcessId');

// Unlike the in-memory unit tests, this proves data actually survives on a
// real file on disk across separate connections — what happens in practice
// when the API restarts.
describe('SqlitePortHistoryRepositoryAdapter (integration, real file)', () => {
  it('persists events to disk across separate adapter instances', async () => {
    const dbPath = path.join(os.tmpdir(), `port-manager-history-${process.pid}-${Math.floor(Math.random() * 1e6)}.sqlite`);
    const usage = new PortUsage({
      portNumber: new PortNumber(8080),
      protocol: new Protocol('TCP'),
      pid: new ProcessId(1234),
      processName: 'node.exe',
    });

    const writer = new SqlitePortHistoryRepositoryAdapter(dbPath);
    try {
      await writer.save(new ProcessTerminatedEvent(usage, new Date('2026-07-29T12:00:00.000Z')));
    } finally {
      writer.close();
    }

    const reader = new SqlitePortHistoryRepositoryAdapter(dbPath);
    try {
      const events = await reader.findAll();
      expect(events).toHaveLength(1);
      expect(events[0].portUsage.portNumber.value).toBe(8080);
    } finally {
      reader.close();
      fs.rmSync(dbPath, { force: true });
    }
  });
});
