const { UnprotectPortPort } = require('../../domain/ports/inbound/UnprotectPortPort');
const { PortProtectionRepositoryPort } = require('../../domain/ports/outbound/PortProtectionRepositoryPort');
const { PortNumber } = require('../../domain/value-objects/PortNumber');

class UnprotectPortUseCase extends UnprotectPortPort {
  #portProtectionRepository;

  constructor(portProtectionRepository) {
    super();

    if (!(portProtectionRepository instanceof PortProtectionRepositoryPort)) {
      throw new Error('UnprotectPortUseCase requires a PortProtectionRepositoryPort instance.');
    }

    this.#portProtectionRepository = portProtectionRepository;
  }

  async execute({ portNumber }) {
    if (!(portNumber instanceof PortNumber)) {
      throw new Error('UnprotectPortUseCase requires a PortNumber instance.');
    }

    // Idempotent, same as ProtectPortUseCase: unprotecting a port that
    // isn't protected is a no-op, not an error.
    await this.#portProtectionRepository.remove(portNumber);
  }
}

module.exports = { UnprotectPortUseCase };
