class OutboundConnectionDTO {
  constructor({
    localPort,
    protocol,
    remoteAddress,
    remotePort,
    remoteHost,
    pid,
    processName,
    executablePath,
    remoteCountry,
    remoteCity,
  }) {
    this.localPort = localPort;
    this.protocol = protocol;
    this.remoteAddress = remoteAddress;
    this.remotePort = remotePort;
    this.remoteHost = remoteHost;
    this.pid = pid;
    this.processName = processName;
    this.executablePath = executablePath;
    this.remoteCountry = remoteCountry;
    this.remoteCity = remoteCity;
  }
}

module.exports = { OutboundConnectionDTO };
