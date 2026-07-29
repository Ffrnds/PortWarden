const { ObservabilityGatewayPort } = require('../../../domain/ports/outbound/ObservabilityGatewayPort');

class InMemoryObservabilityGateway extends ObservabilityGatewayPort {
  #events;

  constructor() {
    super();
    this.#events = [];
  }

  async recordEvent(event) {
    this.#events.push(event);
  }

  list() {
    return [...this.#events];
  }
}

module.exports = { InMemoryObservabilityGateway };
