const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { PortInspectorPort } = require('../../../domain/ports/outbound/PortInspectorPort');
const { PortUsage } = require('../../../domain/entities/PortUsage');
const { PortNumber } = require('../../../domain/value-objects/PortNumber');
const { Protocol } = require('../../../domain/value-objects/Protocol');
const { ProcessId } = require('../../../domain/value-objects/ProcessId');

const execFileAsync = promisify(execFile);

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

class UnixPortInspectorAdapter extends PortInspectorPort {
  async listActivePorts() {
    const { stdout } = await execFileAsync('ss', ['-tulnp']);
    return parseSsOutput(stdout);
  }
}

module.exports = { UnixPortInspectorAdapter, parseSsOutput };
