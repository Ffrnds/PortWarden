const { CachePort } = require('../../../domain/ports/outbound/CachePort');

// The default when REDIS_URL isn't set (see composition-root.js) — this is
// a single-process desktop tool, so an in-memory cache gives the same
// within-process de-duplication benefit as Redis without requiring Docker
// to be running just to list ports. Swap in RedisCacheAdapter only when the
// cache genuinely needs to be shared across processes.
class InMemoryCacheAdapter extends CachePort {
  #store = new Map();

  async get(key) {
    const entry = this.#store.get(key);
    if (!entry) {
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.#store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key, value, ttlSeconds) {
    this.#store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
}

module.exports = { InMemoryCacheAdapter };
