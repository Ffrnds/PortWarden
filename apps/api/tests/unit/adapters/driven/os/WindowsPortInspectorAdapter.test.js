const {
  parseNetstatOutput,
  parseTasklistOutput,
} = require('../../../../../src/adapters/driven/os/WindowsPortInspectorAdapter');

const SAMPLE_TASKLIST_OUTPUT = [
  '"System Idle Process","0","Services","0","8 K"',
  '"System","4","Services","0","132 K"',
  '"svchost.exe","912","Services","0","9,124 K"',
  '"myserver.exe","4784","Console","1","12,345 K"',
].join('\r\n');

const SAMPLE_NETSTAT_OUTPUT = [
  'Active Connections',
  '',
  '  Proto  Local Address          Foreign Address        State           PID',
  '  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       912',
  '  TCP    127.0.0.1:5000         127.0.0.1:54321        ESTABLISHED     8888',
  '  TCP    [::]:445               [::]:0                 LISTENING       4',
  '  TCP    0.0.0.0:0              0.0.0.0:0              LISTENING       9999',
  '  UDP    0.0.0.0:5353           *:*                                    4784',
  '  UDP    [::1]:5354             *:*                                    5200',
].join('\r\n');

describe('parseTasklistOutput', () => {
  it('builds a pid -> image name map from CSV output', () => {
    const map = parseTasklistOutput(SAMPLE_TASKLIST_OUTPUT);

    expect(map.get(0)).toBe('System Idle Process');
    expect(map.get(912)).toBe('svchost.exe');
    expect(map.size).toBe(4);
  });

  it('ignores blank lines', () => {
    const map = parseTasklistOutput(`${SAMPLE_TASKLIST_OUTPUT}\r\n\r\n`);

    expect(map.size).toBe(4);
  });
});

describe('parseNetstatOutput', () => {
  it('includes TCP connections in the LISTENING state', () => {
    const usages = parseNetstatOutput(SAMPLE_NETSTAT_OUTPUT, parseTasklistOutput(SAMPLE_TASKLIST_OUTPUT));

    const port135 = usages.find((usage) => usage.portNumber.value === 135);
    expect(port135.protocol.value).toBe('TCP');
    expect(port135.pid.value).toBe(912);
    expect(port135.processName).toBe('svchost.exe');
  });

  it('excludes TCP connections that are not LISTENING', () => {
    const usages = parseNetstatOutput(SAMPLE_NETSTAT_OUTPUT, parseTasklistOutput(SAMPLE_TASKLIST_OUTPUT));

    expect(usages.some((usage) => usage.pid.value === 8888)).toBe(false);
  });

  it('parses the port out of a bracketed IPv6 local address', () => {
    const usages = parseNetstatOutput(SAMPLE_NETSTAT_OUTPUT, parseTasklistOutput(SAMPLE_TASKLIST_OUTPUT));

    const port445 = usages.find((usage) => usage.portNumber.value === 445);
    expect(port445.pid.value).toBe(4);
    expect(port445.processName).toBe('System');
  });

  it('includes UDP sockets even though they have no connection state', () => {
    const usages = parseNetstatOutput(SAMPLE_NETSTAT_OUTPUT, parseTasklistOutput(SAMPLE_TASKLIST_OUTPUT));

    const udpUsage = usages.find((usage) => usage.portNumber.value === 5353);
    expect(udpUsage.protocol.value).toBe('UDP');
    expect(udpUsage.pid.value).toBe(4784);
    expect(udpUsage.processName).toBe('myserver.exe');
  });

  it('falls back to "Unknown" when the pid is not in the tasklist map', () => {
    const usages = parseNetstatOutput(SAMPLE_NETSTAT_OUTPUT, parseTasklistOutput(SAMPLE_TASKLIST_OUTPUT));

    const udpUsage = usages.find((usage) => usage.portNumber.value === 5354);
    expect(udpUsage.processName).toBe('Unknown');
  });

  it('skips a malformed row (port 0) instead of throwing', () => {
    const usages = parseNetstatOutput(SAMPLE_NETSTAT_OUTPUT, parseTasklistOutput(SAMPLE_TASKLIST_OUTPUT));

    expect(usages.some((usage) => usage.pid.value === 9999)).toBe(false);
    expect(usages).toHaveLength(4);
  });

  it('works with no process name map at all', () => {
    const usages = parseNetstatOutput(SAMPLE_NETSTAT_OUTPUT);

    expect(usages.every((usage) => usage.processName === 'Unknown')).toBe(true);
  });
});
