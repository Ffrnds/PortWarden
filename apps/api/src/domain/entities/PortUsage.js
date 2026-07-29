const { PortNumber } = require('../value-objects/PortNumber');
const { Protocol } = require('../value-objects/Protocol');
const { ProcessId } = require('../value-objects/ProcessId');

class PortUsage {
  #portNumber;
  #protocol;
  #pid;
  #processName;

  constructor({ portNumber, protocol, pid, processName }) {
    if (!(portNumber instanceof PortNumber)) {
      throw new Error('PortUsage requires a PortNumber instance.');
    }
    if (!(protocol instanceof Protocol)) {
      throw new Error('PortUsage requires a Protocol instance.');
    }
    if (!(pid instanceof ProcessId)) {
      throw new Error('PortUsage requires a ProcessId instance.');
    }
    if (typeof processName !== 'string' || processName.trim() === '') {
      throw new Error('PortUsage requires a non-empty processName.');
    }

    this.#portNumber = portNumber;
    this.#protocol = protocol;
    this.#pid = pid;
    this.#processName = processName;
  }

  get portNumber() {
    return this.#portNumber;
  }

  get protocol() {
    return this.#protocol;
  }

  get pid() {
    return this.#pid;
  }

  get processName() {
    return this.#processName;
  }

  get id() {
    return `${this.#portNumber.value}/${this.#protocol.value}/${this.#pid.value}`;
  }

  equals(other) {
    return other instanceof PortUsage && other.id === this.id;
  }
}

module.exports = { PortUsage };
