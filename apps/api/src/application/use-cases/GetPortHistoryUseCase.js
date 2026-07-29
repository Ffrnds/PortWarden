const { GetPortHistoryPort } = require('../../domain/ports/inbound/GetPortHistoryPort');
const { PortHistoryRepositoryPort } = require('../../domain/ports/outbound/PortHistoryRepositoryPort');

class GetPortHistoryUseCase extends GetPortHistoryPort {
  #portHistoryRepository;

  constructor(portHistoryRepository) {
    super();

    if (!(portHistoryRepository instanceof PortHistoryRepositoryPort)) {
      throw new Error('GetPortHistoryUseCase requires a PortHistoryRepositoryPort instance.');
    }

    this.#portHistoryRepository = portHistoryRepository;
  }

  async execute() {
    return this.#portHistoryRepository.findAll();
  }
}

module.exports = { GetPortHistoryUseCase };
