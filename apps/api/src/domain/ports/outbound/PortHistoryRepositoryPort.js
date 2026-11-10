class PortHistoryRepositoryPort {
  /**
   * @param {import('../../events/ProcessTerminatedEvent').ProcessTerminatedEvent} event
   * @returns {Promise<void>}
   */
  async save(event) {
    throw new Error('PortHistoryRepositoryPort.save must be implemented by an adapter.');
  }

  /**
   * @returns {Promise<import('../../events/ProcessTerminatedEvent').ProcessTerminatedEvent[]>}
   */
  async findAll() {
    throw new Error('PortHistoryRepositoryPort.findAll must be implemented by an adapter.');
  }
}

module.exports = { PortHistoryRepositoryPort };
