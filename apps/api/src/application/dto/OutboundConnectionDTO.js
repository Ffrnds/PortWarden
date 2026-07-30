class OutboundConnectionDTO {
  constructor({ localPort, protocol, remoteAddress, remotePort, remoteHost, pid, processName, executablePath }) {
    this.localPort = localPort;
    this.protocol = protocol;
    this.remoteAddress = remoteAddress;
    this.remotePort = remotePort;
    this.remoteHost = remoteHost;
    this.pid = pid;
    this.processName = processName;
    this.executablePath = executablePath;
  }
}

module.exports = { OutboundConnectionDTO };
