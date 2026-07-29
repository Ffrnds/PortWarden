class ProtectPortPort {
  /**
   * @param {unknown} request
   * @returns {Promise<void>}
   */
  async execute(request) {
    throw new Error('ProtectPortPort.execute must be implemented by a use case.');
  }
}

module.exports = { ProtectPortPort };
