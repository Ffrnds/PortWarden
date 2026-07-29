class KillPortPort {
  /**
   * @param {unknown} request
   * @returns {Promise<void>}
   */
  async execute(request) {
    throw new Error('KillPortPort.execute must be implemented by a use case.');
  }
}

module.exports = { KillPortPort };
