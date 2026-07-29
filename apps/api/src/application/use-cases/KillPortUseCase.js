const { KillPortPort } = require('../../domain/ports/inbound/KillPortPort');
const { PortInspectorPort } = require('../../domain/ports/outbound/PortInspectorPort');
const { ProcessTerminatorPort } = require('../../domain/ports/outbound/ProcessTerminatorPort');
const { PortHistoryRepositoryPort } = require('../../domain/ports/outbound/PortHistoryRepositoryPort');
const { ObservabilityGatewayPort } = require('../../domain/ports/outbound/ObservabilityGatewayPort');
const { PortProtectionRepositoryPort } = require('../../domain/ports/outbound/PortProtectionRepositoryPort');
const { PortProtectionPolicy } = require('../../domain/services/PortProtectionPolicy');
const { ProcessTerminatedEvent } = require('../../domain/events/ProcessTerminatedEvent');
const { ProtectedPortError } = require('../../domain/exceptions/ProtectedPortError');

// Fixed rule, not configurable: killing System Idle (0) or System (4) can hang Windows.
const NEVER_KILLABLE_PIDS = [0, 4];

class KillPortUseCase extends KillPortPort {
  #portInspector;
  #processTerminator;
  #portProtectionRepository;
  #portHistoryRepository;
  #observabilityGateway;

  constructor({ portInspector, processTerminator, portProtectionRepository, portHistoryRepository, observabilityGateway }) {
    super();

    if (!(portInspector instanceof PortInspectorPort)) {
      throw new Error('KillPortUseCase requires a PortInspectorPort instance.');
    }
    if (!(processTerminator instanceof ProcessTerminatorPort)) {
      throw new Error('KillPortUseCase requires a ProcessTerminatorPort instance.');
    }
    if (!(portProtectionRepository instanceof PortProtectionRepositoryPort)) {
      throw new Error('KillPortUseCase requires a PortProtectionRepositoryPort instance.');
    }
    if (!(portHistoryRepository instanceof PortHistoryRepositoryPort)) {
      throw new Error('KillPortUseCase requires a PortHistoryRepositoryPort instance.');
    }
    if (!(observabilityGateway instanceof ObservabilityGatewayPort)) {
      throw new Error('KillPortUseCase requires an ObservabilityGatewayPort instance.');
    }

    this.#portInspector = portInspector;
    this.#processTerminator = processTerminator;
    this.#portProtectionRepository = portProtectionRepository;
    this.#portHistoryRepository = portHistoryRepository;
    this.#observabilityGateway = observabilityGateway;
  }

  async execute({ portNumber, protocol }) {
    const usages = await this.#portInspector.listActivePorts();
    const usage = usages.find((candidate) => candidate.portNumber.equals(portNumber) && candidate.protocol.equals(protocol));

    if (!usage) {
      throw new Error(`No process found using port ${portNumber}/${protocol}.`);
    }

    if (NEVER_KILLABLE_PIDS.includes(usage.pid.value)) {
      throw new ProtectedPortError(usage.portNumber);
    }

    const protectedPorts = await this.#portProtectionRepository.findAll();
    const portProtectionPolicy = new PortProtectionPolicy(protectedPorts);

    if (portProtectionPolicy.isProtected(usage.portNumber)) {
      throw new ProtectedPortError(usage.portNumber);
    }

    await this.#processTerminator.terminate(usage.pid);

    const event = new ProcessTerminatedEvent(usage);
    await this.#portHistoryRepository.save(event);
    await this.#observabilityGateway.recordEvent(event);

    return event;
  }
}

module.exports = { KillPortUseCase };
