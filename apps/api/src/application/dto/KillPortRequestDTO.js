class KillPortRequestDTO {
  constructor({ portNumber, protocol }) {
    this.portNumber = portNumber;
    this.protocol = protocol;
  }
}

module.exports = { KillPortRequestDTO };
