const path = require('node:path');
const crypto = require('node:crypto');

const env = {
  port: Number(process.env.PORT) || 3000,
  databasePath: process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'port-manager.sqlite'),
  // Both default to a fresh random value generated once per process boot
  // when unset — this is a single-user, localhost-only desktop tool where
  // the API is started fresh by the same Electron process that loads the
  // one page allowed to talk to it (see apps/desktop/src/main.js), so an
  // ephemeral per-launch secret is the right trade-off: no password to
  // manage, nothing meaningful persisted, and it still means a random
  // local process can't hit the mutating endpoints without first knowing
  // the key handed to that one page. Set JWT_SECRET/ADMIN_ACCESS_KEY
  // explicitly only if something needs the value to survive a restart.
  jwtSecret: process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'),
  adminAccessKey: process.env.ADMIN_ACCESS_KEY || crypto.randomBytes(16).toString('hex'),
  // Opt-in: unset means an in-memory cache (see composition-root.js) — this
  // app works fully without Docker/Redis running, Redis is only worth it if
  // the cache needs to survive/be shared beyond this one process.
  redisUrl: process.env.REDIS_URL || null,
};

module.exports = { env };
