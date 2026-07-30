const { UnprotectPortUseCase } = require('../../../src/application/use-cases/UnprotectPortUseCase');
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

  async remove(portNumber) {
    this.protectedPorts = this.protectedPorts.filter((existing) => !existing.equals(portNumber));
  }
}

describe('UnprotectPortUseCase', () => {
  it('removes a protected port', async () => {
    const repository = new FakePortProtectionRepositoryAdapter([new PortNumber(5432), new PortNumber(6379)]);
    const useCase = new UnprotectPortUseCase(repository);

    await useCase.execute({ portNumber: new PortNumber(5432) });

    expect(repository.protectedPorts.map((port) => port.value)).toEqual([6379]);
  });

  it('is idempotent: unprotecting a port that was never protected does not throw', async () => {
    const repository = new FakePortProtectionRepositoryAdapter([]);
    const useCase = new UnprotectPortUseCase(repository);

    await expect(useCase.execute({ portNumber: new PortNumber(5432) })).resolves.toBeUndefined();
  });

  it('rejects a portNumber that is not a PortNumber instance', async () => {
    const useCase = new UnprotectPortUseCase(new FakePortProtectionRepositoryAdapter());

    await expect(useCase.execute({ portNumber: 5432 })).rejects.toThrow();
  });

  it('rejects a dependency that is not a PortProtectionRepositoryPort', () => {
    expect(() => new UnprotectPortUseCase({ findAll: async () => [], remove: async () => {} })).toThrow();
  });
});
