const net = require('node:net');
const { execSync } = require('node:child_process');
const { RedisCacheAdapter } = require('../../src/adapters/driven/cache/RedisCacheAdapter');

// A real, throwaway Redis container (removed automatically on stop via
// --rm) — same reasoning as every other I/O-touching adapter in this
// project: this proves the actual GET/SET/EX wire behavior, which the
// fail-open unit tests (RedisCacheAdapter.test.js) deliberately don't
// exercise. Bound to a high port so it can't collide with this project's
// own docker-compose redis (6380) or anything else already running.
const HOST_PORT = 16389;

function waitForPort(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    function attempt() {
      const socket = net.connect({ host: '127.0.0.1', port }, () => {
        socket.destroy();
        resolve();
      });
      socket.on('error', () => {
        socket.destroy();
        if (Date.now() > deadline) {
          reject(new Error(`Nothing came up on port ${port} within ${timeoutMs}ms`));
        } else {
          setTimeout(attempt, 300);
        }
      });
    }
    attempt();
  });
}

describe('RedisCacheAdapter (integration, real Redis via Docker)', () => {
  let containerId;

  beforeAll(async () => {
    containerId = execSync(`docker run -d --rm -p ${HOST_PORT}:6379 redis:7-alpine`).toString().trim();
    await waitForPort(HOST_PORT, 20000);
  }, 30000);

  afterAll(() => {
    if (containerId) {
      execSync(`docker stop ${containerId}`);
    }
  });

  it('round-trips an arbitrary JSON-serializable value through a real Redis server', async () => {
    const cache = new RedisCacheAdapter(`redis://127.0.0.1:${HOST_PORT}`);

    await cache.set('portwarden:test:key', { ports: [8080, 3000], nested: { ok: true } }, 60);
    const value = await cache.get('portwarden:test:key');

    expect(value).toEqual({ ports: [8080, 3000], nested: { ok: true } });
    await cache.close();
  }, 10000);

  it('returns null for a key that was never set', async () => {
    const cache = new RedisCacheAdapter(`redis://127.0.0.1:${HOST_PORT}`);

    expect(await cache.get('portwarden:test:never-set')).toBeNull();
    await cache.close();
  }, 10000);

  it('expires the key once the TTL passes', async () => {
    const cache = new RedisCacheAdapter(`redis://127.0.0.1:${HOST_PORT}`);

    await cache.set('portwarden:test:ttl', 'value', 1);
    expect(await cache.get('portwarden:test:ttl')).toBe('value');

    await new Promise((resolve) => setTimeout(resolve, 1300));

    expect(await cache.get('portwarden:test:ttl')).toBeNull();
    await cache.close();
  }, 10000);
});
