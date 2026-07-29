class PortDTO {
  constructor({ port, protocol, pid, processName }) {
    this.port = port;
    this.protocol = protocol;
    this.pid = pid;
    this.processName = processName;
  }
}

module.exports = { PortDTO };
