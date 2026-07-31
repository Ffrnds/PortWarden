const { ListOutboundConnectionsPort } = require('../../domain/ports/inbound/ListOutboundConnectionsPort');
const { PortInspectorPort } = require('../../domain/ports/outbound/PortInspectorPort');

class ListOutboundConnectionsUseCase extends ListOutboundConnectionsPort {
  #portInspector;

  constructor(portInspector) {
    super();

    if (!(portInspector instanceof PortInspectorPort)) {
      throw new Error('ListOutboundConnectionsUseCase requires a PortInspectorPort instance.');
    }

    this.#portInspector = portInspector;
  }

  async execute() {
    return this.#portInspector.listOutboundConnections();
  }
}

module.exports = { ListOutboundConnectionsUseCase };
