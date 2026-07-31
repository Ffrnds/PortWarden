const Redis = require('ioredis');
const { CachePort } = require('../../../domain/ports/outbound/CachePort');

// Fail-open, on purpose: this is a personal desktop tool, and caching is a
// pure performance optimization (see CachingPortInspectorAdapter) — a
// Redis outage should degrade to "every request recomputes", never to "the
// app stops listing ports". get()/set() swallow connection errors and
// report a miss/no-op instead of throwing; the one thing that's allowed to
// be noisy is a single console warning the first time that happens, so a
// genuinely misconfigured REDIS_URL isn't silently invisible forever.
class RedisCacheAdapter extends CachePort {
  #client;
  #warned = false;

  constructor(redisUrl, { logger = console } = {}) {
    super();
    this.#client = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 1000,
      // A handful of quick retries, not zero: a real Redis can take a beat
      // to finish starting up (or briefly bounce on a restart) without
      // being genuinely unreachable — `() => null` (no retries at all)
      // looked equivalent for the "nothing's listening" case this is meant
      // to protect against, but it also meant a single transient hiccup
      // against a real server would permanently kill the connection for
      // the rest of the process's life. Caps out around ~1.5s total.
      retryStrategy: (times) => (times > 5 ? null : times * 100),
    });
    this.#client.on('error', () => {}); // handled per-call below; without this ioredis logs its own unhandled warnings
    this.logger = logger;
  }

  async get(key) {
    try {
      const raw = await this.#client.get(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      this.#warnOnce(error);
      return null;
    }
  }

  async set(key, value, ttlSeconds) {
    try {
      await this.#client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      this.#warnOnce(error);
    }
  }

  async close() {
    this.#client.disconnect();
  }

  #warnOnce(error) {
    if (!this.#warned) {
      this.#warned = true;
      this.logger.warn(`Redis cache unavailable, falling back to no caching: ${error.message}`);
    }
  }
}

module.exports = { RedisCacheAdapter };
