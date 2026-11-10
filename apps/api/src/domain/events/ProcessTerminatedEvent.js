const { PortUsage } = require('../entities/PortUsage');

class ProcessTerminatedEvent {
  #portUsage;
  #occurredAt;

  constructor(portUsage, occurredAt = new Date()) {
    if (!(portUsage instanceof PortUsage)) {
      throw new Error('ProcessTerminatedEvent requires a PortUsage instance.');
    }
    if (!(occurredAt instanceof Date) || Number.isNaN(occurredAt.getTime())) {
      throw new Error('ProcessTerminatedEvent requires a valid Date for occurredAt.');
    }

    this.#portUsage = portUsage;
    this.#occurredAt = occurredAt;
    Object.freeze(this);
  }

  get portUsage() {
    return this.#portUsage;
  }

  get occurredAt() {
    return this.#occurredAt;
  }
}

module.exports = { ProcessTerminatedEvent };
