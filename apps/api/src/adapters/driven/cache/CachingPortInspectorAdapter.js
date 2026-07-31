const { PortInspectorPort } = require('../../../domain/ports/outbound/PortInspectorPort');
const { PortUsage } = require('../../../domain/entities/PortUsage');
const { OutboundConnection } = require('../../../domain/entities/OutboundConnection');
const { PortNumber } = require('../../../domain/value-objects/PortNumber');
const { Protocol } = require('../../../domain/value-objects/Protocol');
const { ProcessId } = require('../../../domain/value-objects/ProcessId');

function portUsageToPlain(usage) {
  return {
    port: usage.portNumber.value,
    protocol: usage.protocol.value,
    pid: usage.pid.value,
    processName: usage.processName,
    executablePath: usage.executablePath,
  };
}

function plainToPortUsage(plain) {
  return new PortUsage({
    portNumber: new PortNumber(plain.port),
    protocol: new Protocol(plain.protocol),
    pid: new ProcessId(plain.pid),
    processName: plain.processName,
    executablePath: plain.executablePath,
  });
}

function connectionToPlain(connection) {
  return {
    localPort: connection.localPort.value,
    protocol: connection.protocol.value,
    remoteAddress: connection.remoteAddress,
    remotePort: connection.remotePort.value,
    pid: connection.pid.value,
    processName: connection.processName,
    remoteHost: connection.remoteHost,
    executablePath: connection.executablePath,
    remoteCountry: connection.remoteCountry,
    remoteCity: connection.remoteCity,
  };
}

function plainToConnection(plain) {
  return new OutboundConnection({
    localPort: new PortNumber(plain.localPort),
    protocol: new Protocol(plain.protocol),
    remoteAddress: plain.remoteAddress,
    remotePort: new PortNumber(plain.remotePort),
    pid: new ProcessId(plain.pid),
    processName: plain.processName,
    remoteHost: plain.remoteHost,
    executablePath: plain.executablePath,
    remoteCountry: plain.remoteCountry,
    remoteCity: plain.remoteCity,
  });
}

const ACTIVE_PORTS_KEY = 'portwarden:ports:active';
const CONNECTIONS_KEY = 'portwarden:ports:connections';

// Decorator around a real PortInspectorPort: netstat/tasklist (or `ss`) is
// the single most expensive thing this API does (multiple seconds under
// load, per the logs), and with the WebSocket broadcaster, the REST
// polling fallback, and the suspicious-activity check now all potentially
// asking for the same snapshot within the same second, a short TTL here
// avoids doing that work more than once per window. KillPortUseCase
// deliberately isn't given this decorator (see composition-root.js) — a
// destructive action should always act on a fresh read, not a cached one.
class CachingPortInspectorAdapter extends PortInspectorPort {
  #inner;
  #cache;
  #ttlSeconds;

  constructor(inner, cache, { ttlSeconds = 2 } = {}) {
    super();
    this.#inner = inner;
    this.#cache = cache;
    this.#ttlSeconds = ttlSeconds;
  }

  async listActivePorts() {
    return this.#cached(ACTIVE_PORTS_KEY, () => this.#inner.listActivePorts(), portUsageToPlain, plainToPortUsage);
  }

  async listOutboundConnections() {
    return this.#cached(CONNECTIONS_KEY, () => this.#inner.listOutboundConnections(), connectionToPlain, plainToConnection);
  }

  // Called after a kill (see KillPortUseCase/composition-root.js) — a
  // destructive action just changed the real answer to "what's listening",
  // so whatever's cached from just before it is now wrong for up to the
  // rest of the TTL. Setting a falsy value makes the next #cached() call
  // treat it as a miss and recompute, without needing a dedicated
  // CachePort.delete() just for this one case.
  async invalidate() {
    await Promise.all([this.#cache.set(ACTIVE_PORTS_KEY, null, 1), this.#cache.set(CONNECTIONS_KEY, null, 1)]);
  }

  async #cached(key, compute, toPlain, fromPlain) {
    const cached = await this.#cache.get(key);
    if (cached) {
      return cached.map(fromPlain);
    }

    const fresh = await compute();
    await this.#cache.set(key, fresh.map(toPlain), this.#ttlSeconds);
    return fresh;
  }
}

module.exports = { CachingPortInspectorAdapter };
