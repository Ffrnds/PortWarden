const { ListPortsPort } = require('../../domain/ports/inbound/ListPortsPort');
const { PortInspectorPort } = require('../../domain/ports/outbound/PortInspectorPort');
const { PortUsageAggregate } = require('../../domain/aggregates/PortUsageAggregate');

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
    const usages = await this.#portInspector.listActivePorts();

    // Routed through the aggregate so a misbehaving inspector (or a race
    // between reading connections and reading process names) can never
    // surface the same port/protocol/pid combination twice.
    const aggregate = new PortUsageAggregate();
    usages.forEach((usage) => {
      if (!aggregate.findById(usage.id)) {
        aggregate.add(usage);
      }
    });

    return aggregate.list();
  }
}

module.exports = { ListPortsUseCase };
