const { PortNumber } = require('../value-objects/PortNumber');
const { Protocol } = require('../value-objects/Protocol');
const { ProcessId } = require('../value-objects/ProcessId');

class PortUsage {
  #portNumber;
  #protocol;
  #pid;
  #processName;
  #executablePath;

  constructor({ portNumber, protocol, pid, processName, executablePath = null }) {
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
    if (executablePath !== null && typeof executablePath !== 'string') {
      throw new Error('PortUsage requires executablePath to be a string or null.');
    }

    this.#portNumber = portNumber;
    this.#protocol = protocol;
    this.#pid = pid;
    this.#processName = processName;
    // Optional: some processes (system ones especially) don't expose a
    // readable path, and Windows itself doesn't always grant access to it.
    this.#executablePath = executablePath;
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

  get executablePath() {
    return this.#executablePath;
  }

  get id() {
    return `${this.#portNumber.value}/${this.#protocol.value}/${this.#pid.value}`;
  }

  equals(other) {
    return other instanceof PortUsage && other.id === this.id;
  }
}

module.exports = { PortUsage };
