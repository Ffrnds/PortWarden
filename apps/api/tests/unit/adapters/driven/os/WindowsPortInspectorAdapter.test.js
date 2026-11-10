const {
  parseNetstatOutput,
  parseProcessListOutput,
  parseOutboundConnectionsOutput,
} = require('../../../../../src/adapters/driven/os/WindowsPortInspectorAdapter');

const SAMPLE_PROCESS_LIST_OUTPUT = JSON.stringify([
  { ProcessId: 0, Name: 'System Idle Process', ExecutablePath: null },
  { ProcessId: 4, Name: 'System', ExecutablePath: null },
  { ProcessId: 912, Name: 'svchost.exe', ExecutablePath: 'C:\\Windows\\System32\\svchost.exe' },
  { ProcessId: 4784, Name: 'myserver.exe', ExecutablePath: 'C:\\dev\\myserver.exe' },
]);

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

const SAMPLE_ESTABLISHED_OUTPUT = [
  'Active Connections',
  '',
  '  Proto  Local Address          Foreign Address        State           PID',
  '  TCP    192.168.15.136:51234   142.250.72.14:443      ESTABLISHED     4112',
  '  TCP    127.0.0.1:49708        127.0.0.1:49709        ESTABLISHED     1760',
  '  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       912',
  '  UDP    0.0.0.0:5353           *:*                                    4784',
].join('\r\n');

describe('parseProcessListOutput', () => {
  it('builds a pid -> {name, executablePath} map from the PowerShell JSON output', () => {
    const map = parseProcessListOutput(SAMPLE_PROCESS_LIST_OUTPUT);

    expect(map.get(0)).toEqual({ name: 'System Idle Process', executablePath: null });
    expect(map.get(912)).toEqual({ name: 'svchost.exe', executablePath: 'C:\\Windows\\System32\\svchost.exe' });
    expect(map.size).toBe(4);
  });

  it('handles PowerShell collapsing a single-result array into a bare object', () => {
    const map = parseProcessListOutput(JSON.stringify({ ProcessId: 1, Name: 'solo.exe', ExecutablePath: 'C:\\solo.exe' }));

    expect(map.get(1)).toEqual({ name: 'solo.exe', executablePath: 'C:\\solo.exe' });
  });

  it('returns an empty map for unparseable output instead of throwing', () => {
    expect(parseProcessListOutput('not json').size).toBe(0);
  });
});

describe('parseNetstatOutput', () => {
  it('includes TCP connections in the LISTENING state, with the resolved executable path', () => {
    const usages = parseNetstatOutput(SAMPLE_NETSTAT_OUTPUT, parseProcessListOutput(SAMPLE_PROCESS_LIST_OUTPUT));

    const port135 = usages.find((usage) => usage.portNumber.value === 135);
    expect(port135.protocol.value).toBe('TCP');
    expect(port135.pid.value).toBe(912);
    expect(port135.processName).toBe('svchost.exe');
    expect(port135.executablePath).toBe('C:\\Windows\\System32\\svchost.exe');
  });

  it('excludes TCP connections that are not LISTENING', () => {
    const usages = parseNetstatOutput(SAMPLE_NETSTAT_OUTPUT, parseProcessListOutput(SAMPLE_PROCESS_LIST_OUTPUT));

    expect(usages.some((usage) => usage.pid.value === 8888)).toBe(false);
  });

  it('parses the port out of a bracketed IPv6 local address', () => {
    const usages = parseNetstatOutput(SAMPLE_NETSTAT_OUTPUT, parseProcessListOutput(SAMPLE_PROCESS_LIST_OUTPUT));

    const port445 = usages.find((usage) => usage.portNumber.value === 445);
    expect(port445.pid.value).toBe(4);
    expect(port445.processName).toBe('System');
    expect(port445.executablePath).toBeNull();
  });

  it('includes UDP sockets even though they have no connection state', () => {
    const usages = parseNetstatOutput(SAMPLE_NETSTAT_OUTPUT, parseProcessListOutput(SAMPLE_PROCESS_LIST_OUTPUT));

    const udpUsage = usages.find((usage) => usage.portNumber.value === 5353);
    expect(udpUsage.protocol.value).toBe('UDP');
    expect(udpUsage.pid.value).toBe(4784);
    expect(udpUsage.processName).toBe('myserver.exe');
    expect(udpUsage.executablePath).toBe('C:\\dev\\myserver.exe');
  });

  it('falls back to "Unknown"/null when the pid is not in the process map', () => {
    const usages = parseNetstatOutput(SAMPLE_NETSTAT_OUTPUT, parseProcessListOutput(SAMPLE_PROCESS_LIST_OUTPUT));

    const udpUsage = usages.find((usage) => usage.portNumber.value === 5354);
    expect(udpUsage.processName).toBe('Unknown');
    expect(udpUsage.executablePath).toBeNull();
  });

  it('skips a malformed row (port 0) instead of throwing', () => {
    const usages = parseNetstatOutput(SAMPLE_NETSTAT_OUTPUT, parseProcessListOutput(SAMPLE_PROCESS_LIST_OUTPUT));

    expect(usages.some((usage) => usage.pid.value === 9999)).toBe(false);
    expect(usages).toHaveLength(4);
  });

  it('works with no process map at all', () => {
    const usages = parseNetstatOutput(SAMPLE_NETSTAT_OUTPUT);

    expect(usages.every((usage) => usage.processName === 'Unknown' && usage.executablePath === null)).toBe(true);
  });
});

describe('parseOutboundConnectionsOutput', () => {
  it('includes only ESTABLISHED TCP rows, with local+remote endpoints', () => {
    const connections = parseOutboundConnectionsOutput(SAMPLE_ESTABLISHED_OUTPUT, parseProcessListOutput(SAMPLE_PROCESS_LIST_OUTPUT));

    expect(connections).toHaveLength(2);
    const toGoogle = connections.find((connection) => connection.remoteAddress === '142.250.72.14');
    expect(toGoogle.localPort.value).toBe(51234);
    expect(toGoogle.remotePort.value).toBe(443);
    expect(toGoogle.pid.value).toBe(4112);
    expect(toGoogle.remoteHost).toBeNull(); // reverse DNS happens elsewhere, not in this pure parser
  });

  it('excludes LISTENING and UDP rows', () => {
    const connections = parseOutboundConnectionsOutput(SAMPLE_ESTABLISHED_OUTPUT, parseProcessListOutput(SAMPLE_PROCESS_LIST_OUTPUT));

    expect(connections.some((connection) => connection.pid.value === 912)).toBe(false);
    expect(connections.some((connection) => connection.pid.value === 4784)).toBe(false);
  });

  it('resolves the process name and executable path from the process map', () => {
    const connections = parseOutboundConnectionsOutput(SAMPLE_ESTABLISHED_OUTPUT, parseProcessListOutput(SAMPLE_PROCESS_LIST_OUTPUT));

    const loopback = connections.find((connection) => connection.pid.value === 1760);
    expect(loopback.processName).toBe('Unknown');
    expect(loopback.executablePath).toBeNull();
  });
});
