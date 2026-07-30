const fs = require('node:fs');
const path = require('node:path');
const { env } = require('./env');

const { WindowsPortInspectorAdapter } = require('../adapters/driven/os/WindowsPortInspectorAdapter');
const { NodeProcessTerminatorAdapter } = require('../adapters/driven/process/NodeProcessTerminatorAdapter');
const { SqlitePortHistoryRepositoryAdapter } = require('../adapters/driven/persistence/SqlitePortHistoryRepositoryAdapter');
const { SqlitePortProtectionRepositoryAdapter } = require('../adapters/driven/persistence/SqlitePortProtectionRepositoryAdapter');
const { InMemoryObservabilityGateway } = require('../adapters/driven/gateways/InMemoryObservabilityGateway');

const { ListPortsUseCase } = require('../application/use-cases/ListPortsUseCase');
const { KillPortUseCase } = require('../application/use-cases/KillPortUseCase');
const { GetPortHistoryUseCase } = require('../application/use-cases/GetPortHistoryUseCase');
const { ProtectPortUseCase } = require('../application/use-cases/ProtectPortUseCase');
const { UnprotectPortUseCase } = require('../application/use-cases/UnprotectPortUseCase');
const { ListProtectedPortsUseCase } = require('../application/use-cases/ListProtectedPortsUseCase');
const { ListOutboundConnectionsUseCase } = require('../application/use-cases/ListOutboundConnectionsUseCase');

// The single place in the whole codebase that knows about concrete adapters.
// Everywhere else only ever sees Ports. Accepts a config override so tests
// can point at a throwaway database instead of the real one.
function buildCompositionRoot(config = env) {
  fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });

  const portInspector = new WindowsPortInspectorAdapter();
  const processTerminator = new NodeProcessTerminatorAdapter();
  const portHistoryRepository = new SqlitePortHistoryRepositoryAdapter(config.databasePath);
  const portProtectionRepository = new SqlitePortProtectionRepositoryAdapter(config.databasePath);
  const observabilityGateway = new InMemoryObservabilityGateway();

  return {
    listPortsUseCase: new ListPortsUseCase(portInspector),
    killPortUseCase: new KillPortUseCase({
      portInspector,
      processTerminator,
      portProtectionRepository,
      portHistoryRepository,
      observabilityGateway,
    }),
    getPortHistoryUseCase: new GetPortHistoryUseCase(portHistoryRepository),
    protectPortUseCase: new ProtectPortUseCase(portProtectionRepository),
    unprotectPortUseCase: new UnprotectPortUseCase(portProtectionRepository),
    listProtectedPortsUseCase: new ListProtectedPortsUseCase(portProtectionRepository),
    listOutboundConnectionsUseCase: new ListOutboundConnectionsUseCase(portInspector),
    close() {
      portHistoryRepository.close();
      portProtectionRepository.close();
    },
  };
}

module.exports = { buildCompositionRoot };
