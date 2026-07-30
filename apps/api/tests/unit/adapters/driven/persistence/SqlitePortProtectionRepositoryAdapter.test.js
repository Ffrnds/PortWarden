const { SqlitePortProtectionRepositoryAdapter } = require('../../../../../src/adapters/driven/persistence/SqlitePortProtectionRepositoryAdapter');
const { PortNumber } = require('../../../../../src/domain/value-objects/PortNumber');

describe('SqlitePortProtectionRepositoryAdapter', () => {
  it('starts with no protected ports', async () => {
    const repository = new SqlitePortProtectionRepositoryAdapter();

    expect(await repository.findAll()).toEqual([]);
  });

  it('persists a protected port', async () => {
    const repository = new SqlitePortProtectionRepositoryAdapter();

    await repository.add(new PortNumber(5432));
    const protectedPorts = await repository.findAll();

    expect(protectedPorts).toHaveLength(1);
    expect(protectedPorts[0].value).toBe(5432);
  });

  it('does not duplicate a port added twice', async () => {
    const repository = new SqlitePortProtectionRepositoryAdapter();

    await repository.add(new PortNumber(5432));
    await repository.add(new PortNumber(5432));

    expect(await repository.findAll()).toHaveLength(1);
  });

  it('removes a protected port', async () => {
    const repository = new SqlitePortProtectionRepositoryAdapter();
    await repository.add(new PortNumber(5432));
    await repository.add(new PortNumber(6379));

    await repository.remove(new PortNumber(5432));

    const protectedPorts = await repository.findAll();
    expect(protectedPorts.map((port) => port.value)).toEqual([6379]);
  });

  it('does not throw when removing a port that was never protected', async () => {
    const repository = new SqlitePortProtectionRepositoryAdapter();

    await expect(repository.remove(new PortNumber(9999))).resolves.toBeUndefined();
  });
});
