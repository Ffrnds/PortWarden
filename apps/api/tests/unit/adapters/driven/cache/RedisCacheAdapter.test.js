const { RedisCacheAdapter } = require('../../../../../src/adapters/driven/cache/RedisCacheAdapter');

// This is the property that actually matters for a personal desktop tool:
// caching must never make the app depend on Redis being up. These tests
// point at an address nothing is listening on and confirm every call fails
// open instead of throwing — the real round-trip-through-a-real-Redis case
// is covered by tests/integration/RedisCacheAdapter.test.js instead
// (spins up a throwaway Docker container), since that needs a real server.
describe('RedisCacheAdapter (fail-open behavior)', () => {
  const unreachableUrl = 'redis://127.0.0.1:1';

  it('get() resolves to null instead of throwing when Redis is unreachable', async () => {
    const cache = new RedisCacheAdapter(unreachableUrl, { logger: { warn: () => {} } });

    await expect(cache.get('key')).resolves.toBeNull();
    await cache.close();
  }, 10000);

  it('set() resolves instead of throwing when Redis is unreachable', async () => {
    const cache = new RedisCacheAdapter(unreachableUrl, { logger: { warn: () => {} } });

    await expect(cache.set('key', 'value', 60)).resolves.toBeUndefined();
    await cache.close();
  }, 10000);

  it('logs a warning only once even after repeated failures', async () => {
    const warnings = [];
    const cache = new RedisCacheAdapter(unreachableUrl, { logger: { warn: (message) => warnings.push(message) } });

    await cache.get('a');
    await cache.get('b');
    await cache.set('c', 1, 60);

    expect(warnings).toHaveLength(1);
    await cache.close();
  }, 10000);
});
