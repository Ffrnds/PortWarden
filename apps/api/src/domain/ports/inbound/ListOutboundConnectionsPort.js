class ListOutboundConnectionsPort {
  /**
   * @returns {Promise<import('../../entities/OutboundConnection').OutboundConnection[]>}
   */
  async execute() {
    throw new Error('ListOutboundConnectionsPort.execute must be implemented by a use case.');
  }
}

module.exports = { ListOutboundConnectionsPort };
