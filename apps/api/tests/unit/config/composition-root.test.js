const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildCompositionRoot } = require('../../../src/config/composition-root');
const { ListPortsPort } = require('../../../src/domain/ports/inbound/ListPortsPort');
const { KillPortPort } = require('../../../src/domain/ports/inbound/KillPortPort');
const { GetPortHistoryPort } = require('../../../src/domain/ports/inbound/GetPortHistoryPort');
const { ProtectPortPort } = require('../../../src/domain/ports/inbound/ProtectPortPort');
const { ListProtectedPortsPort } = require('../../../src/domain/ports/inbound/ListProtectedPortsPort');

describe('buildCompositionRoot', () => {
  it('wires every use case behind its inbound port, using a throwaway database', () => {
    const databasePath = path.join(os.tmpdir(), `port-manager-composition-${process.pid}-${Math.floor(Math.random() * 1e6)}.sqlite`);

    const useCases = buildCompositionRoot({ databasePath });

    try {
      expect(useCases.listPortsUseCase).toBeInstanceOf(ListPortsPort);
      expect(useCases.killPortUseCase).toBeInstanceOf(KillPortPort);
      expect(useCases.getPortHistoryUseCase).toBeInstanceOf(GetPortHistoryPort);
      expect(useCases.protectPortUseCase).toBeInstanceOf(ProtectPortPort);
      expect(useCases.listProtectedPortsUseCase).toBeInstanceOf(ListProtectedPortsPort);
    } finally {
      useCases.close();
      fs.rmSync(databasePath, { force: true });
    }
  });
});
