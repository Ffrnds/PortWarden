class UnprotectPortPort {
  /**
   * @param {unknown} request
   * @returns {Promise<void>}
   */
  async execute(request) {
    throw new Error('UnprotectPortPort.execute must be implemented by a use case.');
  }
}

module.exports = { UnprotectPortPort };
