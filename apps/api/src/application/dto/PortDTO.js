class PortDTO {
  constructor({ port, protocol, pid, processName, executablePath }) {
    this.port = port;
    this.protocol = protocol;
    this.pid = pid;
    this.processName = processName;
    this.executablePath = executablePath;
  }
}

module.exports = { PortDTO };
