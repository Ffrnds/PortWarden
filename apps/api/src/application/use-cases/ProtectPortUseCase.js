const { ProtectPortPort } = require('../../domain/ports/inbound/ProtectPortPort');
const { PortProtectionRepositoryPort } = require('../../domain/ports/outbound/PortProtectionRepositoryPort');
const { PortNumber } = require('../../domain/value-objects/PortNumber');

class ProtectPortUseCase extends ProtectPortPort {
  #portProtectionRepository;

  constructor(portProtectionRepository) {
    super();

    if (!(portProtectionRepository instanceof PortProtectionRepositoryPort)) {
      throw new Error('ProtectPortUseCase requires a PortProtectionRepositoryPort instance.');
    }

    this.#portProtectionRepository = portProtectionRepository;
  }

  async execute({ portNumber }) {
    if (!(portNumber instanceof PortNumber)) {
      throw new Error('ProtectPortUseCase requires a PortNumber instance.');
    }

    const alreadyProtected = (await this.#portProtectionRepository.findAll())
      .some((protectedPort) => protectedPort.equals(portNumber));

    if (alreadyProtected) {
      return;
    }

    await this.#portProtectionRepository.add(portNumber);
  }
}

module.exports = { ProtectPortUseCase };
