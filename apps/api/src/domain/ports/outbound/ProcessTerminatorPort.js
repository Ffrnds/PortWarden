class ProcessTerminatorPort {
  /**
   * @param {import('../../value-objects/ProcessId').ProcessId} pid
   * @returns {Promise<void>}
   */
  async terminate(pid) {
    throw new Error('ProcessTerminatorPort.terminate must be implemented by an adapter.');
  }
}

module.exports = { ProcessTerminatorPort };
