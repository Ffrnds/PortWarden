class PortInspectorPort {
  /**
   * @returns {Promise<import('../../entities/PortUsage').PortUsage[]>}
   */
  async listActivePorts() {
    throw new Error('PortInspectorPort.listActivePorts must be implemented by an adapter.');
  }
}

module.exports = { PortInspectorPort };
