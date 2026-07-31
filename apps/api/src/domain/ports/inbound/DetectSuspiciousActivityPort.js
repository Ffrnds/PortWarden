class DetectSuspiciousActivityPort {
  /**
   * @returns {Promise<Array<{ subject: object, kind: 'listening'|'outbound', reasons: string[] }>>}
   */
  async execute() {
    throw new Error('DetectSuspiciousActivityPort.execute must be implemented by a use case.');
  }
}

module.exports = { DetectSuspiciousActivityPort };
