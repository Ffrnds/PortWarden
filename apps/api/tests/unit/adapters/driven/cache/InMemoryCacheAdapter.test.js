const { InMemoryCacheAdapter } = require('../../../../../src/adapters/driven/cache/InMemoryCacheAdapter');

describe('InMemoryCacheAdapter', () => {
  it('returns null for a key that was never set', async () => {
    const cache = new InMemoryCacheAdapter();

    expect(await cache.get('missing')).toBeNull();
  });

  it('returns the value that was set, before it expires', async () => {
    const cache = new InMemoryCacheAdapter();

    await cache.set('key', { hello: 'world' }, 60);

    expect(await cache.get('key')).toEqual({ hello: 'world' });
  });

  it('returns null once the TTL has elapsed', async () => {
    vi.useFakeTimers();
    const cache = new InMemoryCacheAdapter();

    await cache.set('key', 'value', 2);
    vi.advanceTimersByTime(2001);

    expect(await cache.get('key')).toBeNull();
    vi.useRealTimers();
  });

  it('keeps different keys independent', async () => {
    const cache = new InMemoryCacheAdapter();

    await cache.set('a', 1, 60);
    await cache.set('b', 2, 60);

    expect(await cache.get('a')).toBe(1);
    expect(await cache.get('b')).toBe(2);
  });
});
