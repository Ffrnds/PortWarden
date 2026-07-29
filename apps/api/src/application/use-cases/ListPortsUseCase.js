const { ListPortsPort } = require('../../domain/ports/inbound/ListPortsPort');
const { PortInspectorPort } = require('../../domain/ports/outbound/PortInspectorPort');

class ListPortsUseCase extends ListPortsPort {
  #portInspector;

  constructor(portInspector) {
    super();

    if (!(portInspector instanceof PortInspectorPort)) {
      throw new Error('ListPortsUseCase requires a PortInspectorPort instance.');
    }

    this.#portInspector = portInspector;
  }

  async execute() {
    return this.#portInspector.listActivePorts();
  }
}

module.exports = { ListPortsUseCase };
