class NotifierPort {
  /**
   * @param {string} message
   * @returns {Promise<void>}
   */
  async notify(message) {
    throw new Error('NotifierPort.notify must be implemented by an adapter.');
  }
}

module.exports = { NotifierPort };
