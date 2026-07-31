const { ListProtectedPortsUseCase } = require('../../../src/application/use-cases/ListProtectedPortsUseCase');
const { PortProtectionRepositoryPort } = require('../../../src/domain/ports/outbound/PortProtectionRepositoryPort');
const { PortNumber } = require('../../../src/domain/value-objects/PortNumber');

class FakePortProtectionRepositoryAdapter extends PortProtectionRepositoryPort {
  constructor(protectedPorts) {
    super();
    this.protectedPorts = protectedPorts;
  }

  async findAll() {
    return this.protectedPorts;
  }
}

describe('ListProtectedPortsUseCase', () => {
  it('returns whatever the PortProtectionRepositoryPort reports', async () => {
    const ports = [new PortNumber(5432), new PortNumber(6379)];
    const useCase = new ListProtectedPortsUseCase(new FakePortProtectionRepositoryAdapter(ports));

    expect(await useCase.execute()).toBe(ports);
  });

  it('returns an empty list when nothing is protected', async () => {
    const useCase = new ListProtectedPortsUseCase(new FakePortProtectionRepositoryAdapter([]));

    expect(await useCase.execute()).toEqual([]);
  });

  it('rejects a dependency that is not a PortProtectionRepositoryPort', () => {
    expect(() => new ListProtectedPortsUseCase({ findAll: async () => [] })).toThrow();
  });
});
