const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { ProcessTerminatorPort } = require('../../../domain/ports/outbound/ProcessTerminatorPort');
const { InsufficientPrivilegeError } = require('../../../domain/exceptions/InsufficientPrivilegeError');

const execFileAsync = promisify(execFile);

/**
 * Observed empirically against a real `taskkill /PID <pid> /F`: exit code 1
 * means the caller lacks privilege to terminate the target, exit code 128
 * means the PID no longer exists. Exported as a pure function so this
 * classification is unit-testable without ever running taskkill against a
 * real protected process (which could actually succeed, and be dangerous,
 * if the test happened to run elevated).
 */
function isAccessDeniedError(error) {
  return error?.code === 1;
}

class NodeProcessTerminatorAdapter extends ProcessTerminatorPort {
  async terminate(pid) {
    if (process.platform !== 'win32') {
      process.kill(pid.value, 'SIGTERM');
      return;
    }

    try {
      await execFileAsync('taskkill', ['/PID', String(pid.value), '/F']);
    } catch (error) {
      if (isAccessDeniedError(error)) {
        throw new InsufficientPrivilegeError(pid);
      }
      throw error;
    }
  }
}

module.exports = { NodeProcessTerminatorAdapter, isAccessDeniedError };
