const { PortNumber } = require('../value-objects/PortNumber');

class ProtectedPortError extends Error {
  constructor(portNumber) {
    if (!(portNumber instanceof PortNumber)) {
      throw new Error('ProtectedPortError requires a PortNumber instance.');
    }

    super(`Port ${portNumber.value} is protected and cannot be terminated.`);
    this.name = 'ProtectedPortError';
    this.portNumber = portNumber;
  }
}

module.exports = { ProtectedPortError };
