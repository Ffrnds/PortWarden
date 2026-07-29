const { PortNumber } = require('../value-objects/PortNumber');

class PortProtectionPolicy {
  #protectedPorts;

  constructor(protectedPorts = []) {
    protectedPorts.forEach((port) => {
      if (!(port instanceof PortNumber)) {
        throw new Error('PortProtectionPolicy only accepts PortNumber instances.');
      }
    });

    this.#protectedPorts = [...protectedPorts];
  }

  isProtected(portNumber) {
    if (!(portNumber instanceof PortNumber)) {
      throw new Error('isProtected requires a PortNumber instance.');
    }

    return this.#protectedPorts.some((protectedPort) => protectedPort.equals(portNumber));
  }
}

module.exports = { PortProtectionPolicy };
