class ListProtectedPortsPort {
  /**
   * @returns {Promise<import('../../value-objects/PortNumber').PortNumber[]>}
   */
  async execute() {
    throw new Error('ListProtectedPortsPort.execute must be implemented by a use case.');
  }
}

module.exports = { ListProtectedPortsPort };
