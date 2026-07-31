const { KillPortUseCase } = require('../../../src/application/use-cases/KillPortUseCase');
const { PortInspectorPort } = require('../../../src/domain/ports/outbound/PortInspectorPort');
const { ProcessTerminatorPort } = require('../../../src/domain/ports/outbound/ProcessTerminatorPort');
const { PortHistoryRepositoryPort } = require('../../../src/domain/ports/outbound/PortHistoryRepositoryPort');
const { ObservabilityGatewayPort } = require('../../../src/domain/ports/outbound/ObservabilityGatewayPort');
const { PortProtectionRepositoryPort } = require('../../../src/domain/ports/outbound/PortProtectionRepositoryPort');
const { ProtectedPortError } = require('../../../src/domain/exceptions/ProtectedPortError');
const { InsufficientPrivilegeError } = require('../../../src/domain/exceptions/InsufficientPrivilegeError');
const { PortUsage } = require('../../../src/domain/entities/PortUsage');
const { PortNumber } = require('../../../src/domain/value-objects/PortNumber');
const { Protocol } = require('../../../src/domain/value-objects/Protocol');
const { ProcessId } = require('../../../src/domain/value-objects/ProcessId');

class FakePortInspectorAdapter extends PortInspectorPort {
  constructor(usages) {
    super();
    this.usages = usages;
  }

  async listActivePorts() {
    return this.usages;
  }
}

class FakeProcessTerminatorAdapter extends ProcessTerminatorPort {
  constructor({ throws } = {}) {
    super();
    this.throws = throws;
    this.terminatedPids = [];
  }

  async terminate(pid) {
    if (this.throws) {
      throw this.throws;
    }
    this.terminatedPids.push(pid);
  }
}

class FakePortHistoryRepositoryAdapter extends PortHistoryRepositoryPort {
  constructor() {
    super();
    this.saved = [];
  }

  async save(event) {
    this.saved.push(event);
  }

  async findAll() {
    return this.saved;
  }
}

class FakeObservabilityGatewayAdapter extends ObservabilityGatewayPort {
  constructor() {
    super();
    this.recorded = [];
  }

  async recordEvent(event) {
    this.recorded.push(event);
  }
}

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

function buildPortUsage({ portNumber = 8080, pid = 1234, protocol = 'TCP', processName = 'node.exe' } = {}) {
  return new PortUsage({
    portNumber: new PortNumber(portNumber),
    protocol: new Protocol(protocol),
    pid: new ProcessId(pid),
    processName,
  });
}

function buildUseCase(overrides = {}) {
  return new KillPortUseCase({
    portInspector: overrides.portInspector ?? new FakePortInspectorAdapter([buildPortUsage()]),
    processTerminator: overrides.processTerminator ?? new FakeProcessTerminatorAdapter(),
    portProtectionRepository: overrides.portProtectionRepository ?? new FakePortProtectionRepositoryAdapter(),
    portHistoryRepository: overrides.portHistoryRepository ?? new FakePortHistoryRepositoryAdapter(),
    observabilityGateway: overrides.observabilityGateway ?? new FakeObservabilityGatewayAdapter(),
    invalidateCache: overrides.invalidateCache,
  });
}

const request = { portNumber: new PortNumber(8080), protocol: new Protocol('TCP') };

describe('KillPortUseCase', () => {
  it('terminates the process, saves history and records observability', async () => {
    const processTerminator = new FakeProcessTerminatorAdapter();
    const portHistoryRepository = new FakePortHistoryRepositoryAdapter();
    const observabilityGateway = new FakeObservabilityGatewayAdapter();
    const useCase = buildUseCase({ processTerminator, portHistoryRepository, observabilityGateway });

    const event = await useCase.execute(request);

    expect(processTerminator.terminatedPids).toHaveLength(1);
    expect(processTerminator.terminatedPids[0].value).toBe(1234);
    expect(portHistoryRepository.saved).toEqual([event]);
    expect(observabilityGateway.recorded).toEqual([event]);
    expect(event.portUsage.portNumber.value).toBe(8080);
  });

  it('never terminates PID 0 (System Idle), even without a configured policy', async () => {
    const usage = buildPortUsage({ pid: 0 });
    const processTerminator = new FakeProcessTerminatorAdapter();
    const useCase = buildUseCase({
      portInspector: new FakePortInspectorAdapter([usage]),
      processTerminator,
    });

    await expect(useCase.execute(request)).rejects.toThrow(ProtectedPortError);
    expect(processTerminator.terminatedPids).toHaveLength(0);
  });

  it('never terminates PID 4 (System), even without a configured policy', async () => {
    const usage = buildPortUsage({ pid: 4 });
    const useCase = buildUseCase({ portInspector: new FakePortInspectorAdapter([usage]) });

    await expect(useCase.execute(request)).rejects.toThrow(ProtectedPortError);
  });

  it('respects the configurable protected ports, read fresh from the repository', async () => {
    const processTerminator = new FakeProcessTerminatorAdapter();
    const useCase = buildUseCase({
      processTerminator,
      portProtectionRepository: new FakePortProtectionRepositoryAdapter([new PortNumber(8080)]),
    });

    await expect(useCase.execute(request)).rejects.toThrow(ProtectedPortError);
    expect(processTerminator.terminatedPids).toHaveLength(0);
  });

  it('picks up a port protected after the use case was built (no restart needed)', async () => {
    const processTerminator = new FakeProcessTerminatorAdapter();
    const portProtectionRepository = new FakePortProtectionRepositoryAdapter([]);
    const useCase = buildUseCase({ processTerminator, portProtectionRepository });

    await useCase.execute(request);
    expect(processTerminator.terminatedPids).toHaveLength(1);

    await portProtectionRepository.add(new PortNumber(8080));

    await expect(useCase.execute(request)).rejects.toThrow(ProtectedPortError);
    expect(processTerminator.terminatedPids).toHaveLength(1);
  });

  it('throws when no process is using the requested port/protocol', async () => {
    const useCase = buildUseCase({ portInspector: new FakePortInspectorAdapter([]) });

    await expect(useCase.execute(request)).rejects.toThrow(/No process found/);
  });

  it('calls invalidateCache after a successful kill', async () => {
    let calls = 0;
    const useCase = buildUseCase({ invalidateCache: () => { calls += 1; } });

    await useCase.execute(request);

    expect(calls).toBe(1);
  });

  it('does not call invalidateCache when the kill is rejected (protected port)', async () => {
    let calls = 0;
    const usage = buildPortUsage({ pid: 4 });
    const useCase = buildUseCase({
      portInspector: new FakePortInspectorAdapter([usage]),
      invalidateCache: () => { calls += 1; },
    });

    await expect(useCase.execute(request)).rejects.toThrow(ProtectedPortError);
    expect(calls).toBe(0);
  });

  it('does not call invalidateCache when the terminator throws', async () => {
    let calls = 0;
    const useCase = buildUseCase({
      processTerminator: new FakeProcessTerminatorAdapter({ throws: new Error('boom') }),
      invalidateCache: () => { calls += 1; },
    });

    await expect(useCase.execute(request)).rejects.toThrow('boom');
    expect(calls).toBe(0);
  });

  it('propagates InsufficientPrivilegeError from the terminator without swallowing it', async () => {
    const insufficientPrivilege = new InsufficientPrivilegeError(new ProcessId(1234));
    const portHistoryRepository = new FakePortHistoryRepositoryAdapter();
    const useCase = buildUseCase({
      processTerminator: new FakeProcessTerminatorAdapter({ throws: insufficientPrivilege }),
      portHistoryRepository,
    });

    await expect(useCase.execute(request)).rejects.toBe(insufficientPrivilege);
    expect(portHistoryRepository.saved).toHaveLength(0);
  });
});
