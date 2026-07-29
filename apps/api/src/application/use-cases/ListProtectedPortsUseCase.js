const { ListProtectedPortsPort } = require('../../domain/ports/inbound/ListProtectedPortsPort');
const { PortProtectionRepositoryPort } = require('../../domain/ports/outbound/PortProtectionRepositoryPort');

class ListProtectedPortsUseCase extends ListProtectedPortsPort {
  #portProtectionRepository;

  constructor(portProtectionRepository) {
    super();

    if (!(portProtectionRepository instanceof PortProtectionRepositoryPort)) {
      throw new Error('ListProtectedPortsUseCase requires a PortProtectionRepositoryPort instance.');
    }

    this.#portProtectionRepository = portProtectionRepository;
  }

  async execute() {
    return this.#portProtectionRepository.findAll();
  }
}

module.exports = { ListProtectedPortsUseCase };
