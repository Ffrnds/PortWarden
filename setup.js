// Roda com: node setup.js
// Cria toda a estrutura de pastas do monorepo (com .gitkeep pra ficarem versionadas vazias)

const fs = require('fs');
const path = require('path');

const dirs = [
  'apps/desktop/src',
  'apps/desktop/tests/e2e',

  'apps/web',

  'apps/api/src/domain/entities',
  'apps/api/src/domain/value-objects',
  'apps/api/src/domain/aggregates',
  'apps/api/src/domain/services',
  'apps/api/src/domain/events',
  'apps/api/src/domain/exceptions',
  'apps/api/src/domain/ports/outbound',
  'apps/api/src/domain/ports/inbound',

  'apps/api/src/application/use-cases',
  'apps/api/src/application/dto',
  'apps/api/src/application/mappers',

  'apps/api/src/adapters/driving/http/routes',
  'apps/api/src/adapters/driving/http/controllers',
  'apps/api/src/adapters/driving/http/validators',
  'apps/api/src/adapters/driving/http/swagger',

  'apps/api/src/adapters/driven/os',
  'apps/api/src/adapters/driven/process',
  'apps/api/src/adapters/driven/persistence',
  'apps/api/src/adapters/driven/notification',
  'apps/api/src/adapters/driven/logging',
  'apps/api/src/adapters/driven/metrics',
  'apps/api/src/adapters/driven/gateways',

  'apps/api/src/config',

  'apps/api/tests/unit/domain',
  'apps/api/tests/unit/application',
  'apps/api/tests/integration',
  'apps/api/tests/e2e',
];

let created = 0;

for (const dir of dirs) {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
  const keepFile = path.join(fullPath, '.gitkeep');
  if (!fs.existsSync(keepFile)) {
    fs.writeFileSync(keepFile, '');
    created++;
  }
}

console.log(`Pronto! ${created} de ${dirs.length} pastas criadas com .gitkeep.`);
console.log('Proximo passo: rode os "npm init -y" de cada workspace (veja o chat).');
