class PortProtectionRepositoryPort {
  /**
   * @returns {Promise<import('../../value-objects/PortNumber').PortNumber[]>}
   */
  async findAll() {
    throw new Error('PortProtectionRepositoryPort.findAll must be implemented by an adapter.');
  }

  /**
   * @param {import('../../value-objects/PortNumber').PortNumber} portNumber
   * @returns {Promise<void>}
   */
  async add(portNumber) {
    throw new Error('PortProtectionRepositoryPort.add must be implemented by an adapter.');
  }

  /**
   * @param {import('../../value-objects/PortNumber').PortNumber} portNumber
   * @returns {Promise<void>}
   */
  async remove(portNumber) {
    throw new Error('PortProtectionRepositoryPort.remove must be implemented by an adapter.');
  }
}

module.exports = { PortProtectionRepositoryPort };
