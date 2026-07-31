class GetPortHistoryPort {
  /**
   * @returns {Promise<import('../../events/ProcessTerminatedEvent').ProcessTerminatedEvent[]>}
   */
  async execute() {
    throw new Error('GetPortHistoryPort.execute must be implemented by a use case.');
  }
}

module.exports = { GetPortHistoryPort };
