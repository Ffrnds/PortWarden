const { ProtectPortUseCase } = require('../../../src/application/use-cases/ProtectPortUseCase');
const { PortProtectionRepositoryPort } = require('../../../src/domain/ports/outbound/PortProtectionRepositoryPort');
const { PortNumber } = require('../../../src/domain/value-objects/PortNumber');

class FakePortProtectionRepositoryAdapter extends PortProtectionRepositoryPort {
  constructor(protectedPorts = []) {
    super();
    this.protectedPorts = protectedPorts;
  }

  async findAll() {
    return this.protectedPorts;
  }

  async add(portNumber) {
    this.protectedPorts.push(portNumber);
  }
}

describe('ProtectPortUseCase', () => {
  it('persists a new protected port', async () => {
    const repository = new FakePortProtectionRepositoryAdapter([]);
    const useCase = new ProtectPortUseCase(repository);

    await useCase.execute({ portNumber: new PortNumber(5432) });

    expect(repository.protectedPorts).toHaveLength(1);
    expect(repository.protectedPorts[0].value).toBe(5432);
  });

  it('is idempotent: protecting an already-protected port does not duplicate it', async () => {
    const repository = new FakePortProtectionRepositoryAdapter([new PortNumber(5432)]);
    const useCase = new ProtectPortUseCase(repository);

    await useCase.execute({ portNumber: new PortNumber(5432) });

    expect(repository.protectedPorts).toHaveLength(1);
  });

  it('rejects a portNumber that is not a PortNumber instance', async () => {
    const useCase = new ProtectPortUseCase(new FakePortProtectionRepositoryAdapter());

    await expect(useCase.execute({ portNumber: 5432 })).rejects.toThrow();
  });

  it('rejects a dependency that is not a PortProtectionRepositoryPort', () => {
    expect(() => new ProtectPortUseCase({ findAll: async () => [], add: async () => {} })).toThrow();
  });
});
