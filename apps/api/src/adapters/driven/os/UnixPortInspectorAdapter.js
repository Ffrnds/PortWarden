const { execFile } = require('node:child_process');
const dns = require('node:dns');
const fs = require('node:fs/promises');
const { promisify } = require('node:util');
const geoip = require('geoip-lite');
const { PortInspectorPort } = require('../../../domain/ports/outbound/PortInspectorPort');
const { PortUsage } = require('../../../domain/entities/PortUsage');
const { OutboundConnection } = require('../../../domain/entities/OutboundConnection');
const { PortNumber } = require('../../../domain/value-objects/PortNumber');
const { Protocol } = require('../../../domain/value-objects/Protocol');
const { ProcessId } = require('../../../domain/value-objects/ProcessId');

const execFileAsync = promisify(execFile);
const reverseDns = promisify(dns.reverse);

/**
 * Parses `ss -tulnp` output into PortUsage entities. Kept mainly to prove
 * the hexagon's promise: swapping OS only means adding another
 * PortInspectorPort implementation, never touching domain/ or application/.
 * This port manager ships for Windows only, so this adapter has no real
 * integration test — there's no Linux box in this project to run `ss` on.
 */
function parseSsOutput(output) {
  const usages = [];

  output.split(/\r?\n/).forEach((line) => {
    const parts = line.trim().split(/\s+/);
    const netId = parts[0];
    const protocol = netId?.startsWith('tcp') ? 'TCP' : netId?.startsWith('udp') ? 'UDP' : null;

    if (!protocol) {
      return;
    }
    if (protocol === 'TCP' && parts[1] !== 'LISTEN') {
      return;
    }

    const localAddress = parts[4];
    const port = Number(localAddress?.slice(localAddress.lastIndexOf(':') + 1));
    const processField = parts.slice(6).join(' ');
    const pidMatch = processField.match(/pid=(\d+)/);
    const nameMatch = processField.match(/\(\("([^"]+)"/);
    const pid = pidMatch ? Number(pidMatch[1]) : NaN;

    if (!Number.isInteger(pid) || !Number.isInteger(port)) {
      return;
    }

    try {
      usages.push(
        new PortUsage({
          portNumber: new PortNumber(port),
          protocol: new Protocol(protocol),
          pid: new ProcessId(pid),
          processName: nameMatch ? nameMatch[1] : 'Unknown',
        })
      );
    } catch {
      // Malformed or out-of-range row — skip it rather than failing the
      // whole listing because of one bad line.
    }
  });

  return usages;
}

/**
 * Parses `ss -tnp` output for ESTABLISHED rows into OutboundConnection
 * entities. Same caveat as parseSsOutput: unverified, no Linux box here.
 */
function parseSsOutboundOutput(output) {
  const connections = [];

  output.split(/\r?\n/).forEach((line) => {
    const parts = line.trim().split(/\s+/);
    // Same column layout as parseSsOutput: Netid, State, Recv-Q, Send-Q,
    // Local Address:Port, Peer Address:Port, Process.
    if (parts[0] !== 'tcp' || parts[1] !== 'ESTAB') {
      return;
    }

    const localAddress = parts[4];
    const remoteFull = parts[5];
    const localPort = Number(localAddress?.slice(localAddress.lastIndexOf(':') + 1));
    const remoteAddress = remoteFull?.slice(0, remoteFull.lastIndexOf(':'));
    const remotePort = Number(remoteFull?.slice(remoteFull.lastIndexOf(':') + 1));
    const processField = parts.slice(6).join(' ');
    const pidMatch = processField.match(/pid=(\d+)/);
    const nameMatch = processField.match(/\(\("([^"]+)"/);
    const pid = pidMatch ? Number(pidMatch[1]) : NaN;

    if (!Number.isInteger(pid) || !Number.isInteger(localPort) || !Number.isInteger(remotePort) || !remoteAddress) {
      return;
    }

    try {
      connections.push(
        new OutboundConnection({
          localPort: new PortNumber(localPort),
          protocol: new Protocol('TCP'),
          remoteAddress,
          remotePort: new PortNumber(remotePort),
          pid: new ProcessId(pid),
          processName: nameMatch ? nameMatch[1] : 'Unknown',
        })
      );
    } catch {
      // Same reasoning as parseSsOutput: skip malformed rows.
    }
  });

  return connections;
}

class UnixPortInspectorAdapter extends PortInspectorPort {
  async listActivePorts() {
    const { stdout } = await execFileAsync('ss', ['-tulnp']);
    const usages = parseSsOutput(stdout);
    return this.#withExecutablePaths(usages);
  }

  async listOutboundConnections() {
    const { stdout } = await execFileAsync('ss', ['-tnp']);
    const connections = parseSsOutboundOutput(stdout);
    const withHosts = await this.#resolveRemoteHosts(connections);
    return this.#resolveGeoLocations(withHosts);
  }

  // /proc/<pid>/exe is a symlink to the executable — readable on Linux
  // (not macOS/BSD) for processes you have permission to inspect.
  async #withExecutablePaths(usages) {
    const uniquePids = [...new Set(usages.map((usage) => usage.pid.value))];
    const pathByPid = new Map();

    await Promise.all(
      uniquePids.map(async (pid) => {
        try {
          pathByPid.set(pid, await fs.readlink(`/proc/${pid}/exe`));
        } catch {
          // No access, process gone, or not on Linux — leave it unresolved.
        }
      })
    );

    return usages.map((usage) => {
      const executablePath = pathByPid.get(usage.pid.value) ?? null;
      return new PortUsage({
        portNumber: usage.portNumber,
        protocol: usage.protocol,
        pid: usage.pid,
        processName: usage.processName,
        executablePath,
      });
    });
  }

  async #resolveRemoteHosts(connections) {
    const uniqueAddresses = [...new Set(connections.map((connection) => connection.remoteAddress))];
    const hostByAddress = new Map();

    await Promise.all(
      uniqueAddresses.map(async (address) => {
        try {
          const hostnames = await Promise.race([
            reverseDns(address),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
          ]);
          if (hostnames?.[0]) {
            hostByAddress.set(address, hostnames[0]);
          }
        } catch {
          // No PTR record, or the lookup timed out.
        }
      })
    );

    return connections.map((connection) => connection.withRemoteHost(hostByAddress.get(connection.remoteAddress) ?? null));
  }

  #resolveGeoLocations(connections) {
    return connections.map((connection) => {
      const location = geoip.lookup(connection.remoteAddress);
      if (!location) {
        return connection;
      }
      return connection.withGeoLocation({
        country: location.country || null,
        city: location.city || null,
      });
    });
  }
}

module.exports = { UnixPortInspectorAdapter, parseSsOutput, parseSsOutboundOutput };
