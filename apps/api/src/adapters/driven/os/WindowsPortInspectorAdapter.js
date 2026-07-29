const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { PortInspectorPort } = require('../../../domain/ports/outbound/PortInspectorPort');
const { PortUsage } = require('../../../domain/entities/PortUsage');
const { PortNumber } = require('../../../domain/value-objects/PortNumber');
const { Protocol } = require('../../../domain/value-objects/Protocol');
const { ProcessId } = require('../../../domain/value-objects/ProcessId');

const execFileAsync = promisify(execFile);

/**
 * Parses `tasklist /FO CSV /NH` output into a PID -> image name map.
 * Exported (not a class method) so it can be unit tested with canned text,
 * without ever spawning a real process.
 */
function parseTasklistOutput(output) {
  const processNamesByPid = new Map();

  output.split(/\r?\n/).forEach((line) => {
    if (!line.trim()) {
      return;
    }

    const [imageName, pidField] = line.split('","').map((field) => field.replace(/^"|"$/g, ''));
    const pid = Number(pidField);

    if (!imageName || !Number.isInteger(pid)) {
      return;
    }

    processNamesByPid.set(pid, imageName);
  });

  return processNamesByPid;
}

/**
 * Parses `netstat -ano` output into PortUsage entities, resolving process
 * names from the map produced by parseTasklistOutput. Only TCP connections
 * in the LISTENING state are considered "in use" (an established outbound
 * connection isn't a port you'd want to free up). UDP has no connection
 * state, so every bound UDP socket is included.
 */
function parseNetstatOutput(output, processNamesByPid = new Map()) {
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

    try {
      usages.push(
        new PortUsage({
          portNumber: new PortNumber(port),
          protocol: new Protocol(protocol),
          pid: new ProcessId(pid),
          processName: processNamesByPid.get(pid) ?? 'Unknown',
        })
      );
    } catch {
      // Malformed or out-of-range row (e.g. port 0) — skip it rather than
      // failing the whole listing because of one bad line.
    }
  });

  return usages;
}

class WindowsPortInspectorAdapter extends PortInspectorPort {
  async listActivePorts() {
    const [netstatOutput, tasklistOutput] = await Promise.all([
      execFileAsync('netstat', ['-ano']).then((result) => result.stdout),
      execFileAsync('tasklist', ['/FO', 'CSV', '/NH']).then((result) => result.stdout),
    ]);

    return parseNetstatOutput(netstatOutput, parseTasklistOutput(tasklistOutput));
  }
}

module.exports = { WindowsPortInspectorAdapter, parseNetstatOutput, parseTasklistOutput };
