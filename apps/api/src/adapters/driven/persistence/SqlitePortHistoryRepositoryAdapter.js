const { DatabaseSync } = require('node:sqlite');
const { PortHistoryRepositoryPort } = require('../../../domain/ports/outbound/PortHistoryRepositoryPort');
const { ProcessTerminatedEvent } = require('../../../domain/events/ProcessTerminatedEvent');
const { PortUsage } = require('../../../domain/entities/PortUsage');
const { PortNumber } = require('../../../domain/value-objects/PortNumber');
const { Protocol } = require('../../../domain/value-objects/Protocol');
const { ProcessId } = require('../../../domain/value-objects/ProcessId');

class SqlitePortHistoryRepositoryAdapter extends PortHistoryRepositoryPort {
  #db;

  constructor(databasePath = ':memory:') {
    super();

    this.#db = new DatabaseSync(databasePath);
    this.#db.exec(`
      CREATE TABLE IF NOT EXISTS port_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        port INTEGER NOT NULL,
        protocol TEXT NOT NULL,
        pid INTEGER NOT NULL,
        process_name TEXT NOT NULL,
        executable_path TEXT,
        occurred_at TEXT NOT NULL
      )
    `);
  }

  async save(event) {
    const insert = this.#db.prepare(
      'INSERT INTO port_history (port, protocol, pid, process_name, executable_path, occurred_at) VALUES (?, ?, ?, ?, ?, ?)'
    );

    insert.run(
      event.portUsage.portNumber.value,
      event.portUsage.protocol.value,
      event.portUsage.pid.value,
      event.portUsage.processName,
      event.portUsage.executablePath,
      event.occurredAt.toISOString()
    );
  }

  async findAll() {
    const rows = this.#db.prepare('SELECT * FROM port_history ORDER BY id ASC').all();
    return rows.map((row) => this.#toEvent(row));
  }

  // Cheapest possible round trip to the database — used by the readiness
  // health check to tell "process is up" apart from "process can actually
  // read/write its data".
  ping() {
    this.#db.prepare('SELECT 1').get();
  }

  #toEvent(row) {
    const usage = new PortUsage({
      portNumber: new PortNumber(row.port),
      protocol: new Protocol(row.protocol),
      pid: new ProcessId(row.pid),
      processName: row.process_name,
      executablePath: row.executable_path,
    });

    return new ProcessTerminatedEvent(usage, new Date(row.occurred_at));
  }

  close() {
    this.#db.close();
  }
}

module.exports = { SqlitePortHistoryRepositoryAdapter };
