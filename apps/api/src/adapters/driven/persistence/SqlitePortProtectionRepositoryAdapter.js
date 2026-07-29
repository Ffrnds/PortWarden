const { DatabaseSync } = require('node:sqlite');
const { PortProtectionRepositoryPort } = require('../../../domain/ports/outbound/PortProtectionRepositoryPort');
const { PortNumber } = require('../../../domain/value-objects/PortNumber');

class SqlitePortProtectionRepositoryAdapter extends PortProtectionRepositoryPort {
  #db;

  constructor(databasePath = ':memory:') {
    super();

    this.#db = new DatabaseSync(databasePath);
    this.#db.exec(`
      CREATE TABLE IF NOT EXISTS protected_ports (
        port INTEGER PRIMARY KEY
      )
    `);
  }

  async findAll() {
    const rows = this.#db.prepare('SELECT port FROM protected_ports ORDER BY port ASC').all();
    return rows.map((row) => new PortNumber(row.port));
  }

  async add(portNumber) {
    this.#db.prepare('INSERT OR IGNORE INTO protected_ports (port) VALUES (?)').run(portNumber.value);
  }

  close() {
    this.#db.close();
  }
}

module.exports = { SqlitePortProtectionRepositoryAdapter };
