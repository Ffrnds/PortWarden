const { execFile } = require('node:child_process');
const dns = require('node:dns');
const { promisify } = require('node:util');
const { PortInspectorPort } = require('../../../domain/ports/outbound/PortInspectorPort');
const { PortUsage } = require('../../../domain/entities/PortUsage');
const { OutboundConnection } = require('../../../domain/entities/OutboundConnection');
const { PortNumber } = require('../../../domain/value-objects/PortNumber');
const { Protocol } = require('../../../domain/value-objects/Protocol');
const { ProcessId } = require('../../../domain/value-objects/ProcessId');

const execFileAsync = promisify(execFile);
const reverseDns = promisify(dns.reverse);

/**
 * Parses the JSON from
 * `Get-CimInstance Win32_Process | Select ProcessId, Name, ExecutablePath | ConvertTo-Json`
 * into a PID -> { name, executablePath } map. Replaces the older
 * `tasklist /FO CSV /NH` lookup — same one-shot-for-every-process shape,
 * but this one also gives us the full executable path (tasklist doesn't),
 * which is what tells apart generic names like "helper.exe" or "node.exe".
 * Exported (not a class method) so it's unit testable with canned text.
 */
function parseProcessListOutput(output) {
  const processInfoByPid = new Map();
  let entries;

  try {
    const parsed = JSON.parse(output);
    entries = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return processInfoByPid;
  }

  entries.forEach((entry) => {
    const pid = Number(entry?.ProcessId);
    if (!Number.isInteger(pid)) {
      return;
    }
    processInfoByPid.set(pid, {
      name: entry.Name ?? 'Unknown',
      executablePath: entry.ExecutablePath ?? null,
    });
  });

  return processInfoByPid;
}

function lookupProcessInfo(processInfoByPid, pid) {
  return processInfoByPid.get(pid) ?? { name: 'Unknown', executablePath: null };
}

/**
 * Parses `netstat -ano` output into PortUsage entities, resolving process
 * info from the map produced by parseProcessListOutput. Only TCP
 * connections in the LISTENING state are considered "in use" (an
 * established outbound connection isn't a port you'd want to free up —
 * see parseOutboundConnectionsOutput for those). UDP has no connection
 * state, so every bound UDP socket is included.
 */
function parseNetstatOutput(output, processInfoByPid = new Map()) {
  const usages = [];

  output.split(/\r?\n/).forEach((line) => {
    const parts = line.trim().split(/\s+/);
    const protocol = parts[0];

    if (protocol !== 'TCP' && protocol !== 'UDP') {
      return;
    }
    if (protocol === 'TCP' && parts[3] !== 'LISTENING') {
      return;
    }

    const localAddress = parts[1];
    const pidField = protocol === 'TCP' ? parts[4] : parts[3];
    const pid = Number(pidField);
    const port = Number(localAddress.slice(localAddress.lastIndexOf(':') + 1));

    if (!Number.isInteger(pid) || !Number.isInteger(port)) {
      return;
    }

    const { name, executablePath } = lookupProcessInfo(processInfoByPid, pid);

    try {
      usages.push(
        new PortUsage({
          portNumber: new PortNumber(port),
          protocol: new Protocol(protocol),
          pid: new ProcessId(pid),
          processName: name,
          executablePath,
        })
      );
    } catch {
      // Malformed or out-of-range row (e.g. port 0) — skip it rather than
      // failing the whole listing because of one bad line.
    }
  });

  return usages;
}

/**
 * Parses `netstat -ano` output for ESTABLISHED TCP rows into
 * OutboundConnection entities — the "who is this process actually talking
 * to" view, as opposed to parseNetstatOutput's "what is this process
 * listening on". Reverse DNS is resolved separately (it's I/O), not here.
 */
function parseOutboundConnectionsOutput(output, processInfoByPid = new Map()) {
  const connections = [];

  output.split(/\r?\n/).forEach((line) => {
    const parts = line.trim().split(/\s+/);
    const protocol = parts[0];

    if (protocol !== 'TCP' || parts[3] !== 'ESTABLISHED') {
      return;
    }

    const localAddress = parts[1];
    const foreignAddress = parts[2];
    const pid = Number(parts[4]);
    const localPort = Number(localAddress.slice(localAddress.lastIndexOf(':') + 1));
    const remoteAddress = foreignAddress.slice(0, foreignAddress.lastIndexOf(':'));
    const remotePort = Number(foreignAddress.slice(foreignAddress.lastIndexOf(':') + 1));

    if (!Number.isInteger(pid) || !Number.isInteger(localPort) || !Number.isInteger(remotePort) || !remoteAddress) {
      return;
    }

    const { name, executablePath } = lookupProcessInfo(processInfoByPid, pid);

    try {
      connections.push(
        new OutboundConnection({
          localPort: new PortNumber(localPort),
          protocol: new Protocol(protocol),
          remoteAddress,
          remotePort: new PortNumber(remotePort),
          pid: new ProcessId(pid),
          processName: name,
          executablePath,
        })
      );
    } catch {
      // Same reasoning as parseNetstatOutput: skip malformed rows.
    }
  });

  return connections;
}

class WindowsPortInspectorAdapter extends PortInspectorPort {
  async listActivePorts() {
    const [netstatOutput, processInfoByPid] = await Promise.all([this.#runNetstat(), this.#runProcessList()]);
    return parseNetstatOutput(netstatOutput, processInfoByPid);
  }

  async listOutboundConnections() {
    const [netstatOutput, processInfoByPid] = await Promise.all([this.#runNetstat(), this.#runProcessList()]);
    const connections = parseOutboundConnectionsOutput(netstatOutput, processInfoByPid);
    return this.#resolveRemoteHosts(connections);
  }

  async #runNetstat() {
    const { stdout } = await execFileAsync('netstat', ['-ano']);
    return stdout;
  }

  async #runProcessList() {
    const { stdout } = await execFileAsync('powershell', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      'Get-CimInstance Win32_Process | Select-Object ProcessId, Name, ExecutablePath | ConvertTo-Json',
    ]);
    return parseProcessListOutput(stdout);
  }

  // Reverse DNS, in parallel, deduped by IP (a browser can easily hold a
  // dozen connections to the same handful of CDN addresses) and bounded by
  // a short timeout — an unresponsive resolver shouldn't stall the whole
  // list. Best-effort: no PTR record just means no hostname, not an error.
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
          // No PTR record, or the lookup timed out — leave it unresolved.
        }
      })
    );

    return connections.map((connection) => connection.withRemoteHost(hostByAddress.get(connection.remoteAddress) ?? null));
  }
}

module.exports = {
  WindowsPortInspectorAdapter,
  parseNetstatOutput,
  parseProcessListOutput,
  parseOutboundConnectionsOutput,
};
