const { ProcessId } = require('../value-objects/ProcessId');

class InsufficientPrivilegeError extends Error {
  constructor(pid) {
    if (!(pid instanceof ProcessId)) {
      throw new Error('InsufficientPrivilegeError requires a ProcessId instance.');
    }

    super(`Insufficient privilege to terminate process ${pid.value}.`);
    this.name = 'InsufficientPrivilegeError';
    this.pid = pid;
  }
}

module.exports = { InsufficientPrivilegeError };
