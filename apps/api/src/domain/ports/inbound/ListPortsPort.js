class ListPortsPort {
  /**
   * @returns {Promise<import('../../entities/PortUsage').PortUsage[]>}
   */
  async execute() {
    throw new Error('ListPortsPort.execute must be implemented by a use case.');
  }
}

module.exports = { ListPortsPort };
