const { PortNumber } = require('../value-objects/PortNumber');
const { Protocol } = require('../value-objects/Protocol');
const { ProcessId } = require('../value-objects/ProcessId');

// "Who is this process actually talking to" — the counterpart to
// PortUsage's "what is this process listening on". Identified by
// local+remote endpoint+pid at a point in time; unlike PortUsage there's no
// use case that acts on this identity over time, so equality isn't a
// concern here the way it was for PortUsage.
class OutboundConnection {
  #localPort;
  #protocol;
  #remoteAddress;
  #remotePort;
  #remoteHost;
  #pid;
  #processName;
  #executablePath;
  #remoteCountry;
  #remoteCity;

  constructor({
    localPort,
    protocol,
    remoteAddress,
    remotePort,
    pid,
    processName,
    remoteHost = null,
    executablePath = null,
    remoteCountry = null,
    remoteCity = null,
  }) {
    if (!(localPort instanceof PortNumber)) {
      throw new Error('OutboundConnection requires a PortNumber instance for localPort.');
    }
    if (!(protocol instanceof Protocol)) {
      throw new Error('OutboundConnection requires a Protocol instance.');
    }
    if (typeof remoteAddress !== 'string' || remoteAddress.trim() === '') {
      throw new Error('OutboundConnection requires a non-empty remoteAddress.');
    }
    if (!(remotePort instanceof PortNumber)) {
      throw new Error('OutboundConnection requires a PortNumber instance for remotePort.');
    }
    if (!(pid instanceof ProcessId)) {
      throw new Error('OutboundConnection requires a ProcessId instance.');
    }
    if (typeof processName !== 'string' || processName.trim() === '') {
      throw new Error('OutboundConnection requires a non-empty processName.');
    }

    this.#localPort = localPort;
    this.#protocol = protocol;
    this.#remoteAddress = remoteAddress;
    this.#remotePort = remotePort;
    this.#pid = pid;
    this.#processName = processName;
    this.#remoteHost = remoteHost;
    this.#executablePath = executablePath;
    this.#remoteCountry = remoteCountry;
    this.#remoteCity = remoteCity;
    Object.freeze(this);
  }

  get localPort() {
    return this.#localPort;
  }

  get protocol() {
    return this.#protocol;
  }

  get remoteAddress() {
    return this.#remoteAddress;
  }

  get remotePort() {
    return this.#remotePort;
  }

  get remoteHost() {
    return this.#remoteHost;
  }

  get pid() {
    return this.#pid;
  }

  get processName() {
    return this.#processName;
  }

  get executablePath() {
    return this.#executablePath;
  }

  get remoteCountry() {
    return this.#remoteCountry;
  }

  get remoteCity() {
    return this.#remoteCity;
  }

  // Reverse DNS happens after the connection is built (it's a separate,
  // slower I/O step) — this hands back a new, otherwise-identical instance
  // with the resolved hostname, keeping the entity itself immutable.
  withRemoteHost(remoteHost) {
    return new OutboundConnection({
      localPort: this.#localPort,
      protocol: this.#protocol,
      remoteAddress: this.#remoteAddress,
      remotePort: this.#remotePort,
      pid: this.#pid,
      processName: this.#processName,
      executablePath: this.#executablePath,
      remoteCountry: this.#remoteCountry,
      remoteCity: this.#remoteCity,
      remoteHost,
    });
  }

  // GeoIP is a local, synchronous lookup (unlike reverse DNS), but it's
  // still a separate enrichment step run by the adapter after the raw
  // connection is parsed from netstat — same immutable-copy shape either
  // way.
  withGeoLocation({ country, city }) {
    return new OutboundConnection({
      localPort: this.#localPort,
      protocol: this.#protocol,
      remoteAddress: this.#remoteAddress,
      remotePort: this.#remotePort,
      pid: this.#pid,
      processName: this.#processName,
      executablePath: this.#executablePath,
      remoteHost: this.#remoteHost,
      remoteCountry: country,
      remoteCity: city,
    });
  }
}

module.exports = { OutboundConnection };
