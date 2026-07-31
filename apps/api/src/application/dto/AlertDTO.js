class AlertDTO {
  constructor({ type, port, protocol, localPort, remoteAddress, remoteHost, remotePort, pid, processName, reasons }) {
    this.type = type;
    this.port = port;
    this.protocol = protocol;
    this.localPort = localPort;
    this.remoteAddress = remoteAddress;
    this.remoteHost = remoteHost;
    this.remotePort = remotePort;
    this.pid = pid;
    this.processName = processName;
    this.reasons = reasons;
  }
}

module.exports = { AlertDTO };
