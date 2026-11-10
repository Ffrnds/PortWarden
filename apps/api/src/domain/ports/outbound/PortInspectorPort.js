class PortInspectorPort {
  /**
   * @returns {Promise<import('../../entities/PortUsage').PortUsage[]>}
   */
  async listActivePorts() {
    throw new Error('PortInspectorPort.listActivePorts must be implemented by an adapter.');
  }

  /**
   * @returns {Promise<import('../../entities/OutboundConnection').OutboundConnection[]>}
   */
  async listOutboundConnections() {
    throw new Error('PortInspectorPort.listOutboundConnections must be implemented by an adapter.');
  }
}

module.exports = { PortInspectorPort };
