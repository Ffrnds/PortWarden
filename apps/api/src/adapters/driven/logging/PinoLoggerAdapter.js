const pino = require('pino');

class PinoLoggerAdapter {
  #logger;

  constructor(destination = process.stdout) {
    this.#logger = pino(destination);
  }

  info(message, meta = {}) {
    this.#logger.info(meta, message);
  }

  warn(message, meta = {}) {
    this.#logger.warn(meta, message);
  }

  error(message, meta = {}) {
    this.#logger.error(meta, message);
  }
}

module.exports = { PinoLoggerAdapter };
