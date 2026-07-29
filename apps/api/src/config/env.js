const path = require('node:path');

const env = {
  port: Number(process.env.PORT) || 3000,
  databasePath: process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'port-manager.sqlite'),
};

module.exports = { env };
