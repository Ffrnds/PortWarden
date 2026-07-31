class ObservabilityGatewayPort {
  /**
   * @param {import('../../events/ProcessTerminatedEvent').ProcessTerminatedEvent} event
   * @returns {Promise<void>}
   */
  async recordEvent(event) {
    throw new Error('ObservabilityGatewayPort.recordEvent must be implemented by an adapter.');
  }
}

module.exports = { ObservabilityGatewayPort };
