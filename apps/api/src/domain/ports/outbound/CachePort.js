class CachePort {
  /**
   * @param {string} key
   * @returns {Promise<any | null>}
   */
  async get(key) {
    throw new Error('CachePort.get must be implemented by an adapter.');
  }

  /**
   * @param {string} key
   * @param {any} value
   * @param {number} ttlSeconds
   * @returns {Promise<void>}
   */
  async set(key, value, ttlSeconds) {
    throw new Error('CachePort.set must be implemented by an adapter.');
  }
}

module.exports = { CachePort };
