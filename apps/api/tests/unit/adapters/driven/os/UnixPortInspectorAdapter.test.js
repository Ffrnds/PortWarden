const { parseSsOutput, parseSsOutboundOutput } = require('../../../../../src/adapters/driven/os/UnixPortInspectorAdapter');

const SAMPLE_SS_OUTPUT = [
  'Netid State  Recv-Q Send-Q   Local Address:Port    Peer Address:Port  Process',
  'tcp   LISTEN 0      128      0.0.0.0:22            0.0.0.0:*          users:(("sshd",pid=1234,fd=3))',
  'tcp   ESTAB  0      0        127.0.0.1:5432        127.0.0.1:54321    users:(("postgres",pid=5678,fd=5))',
  'udp   UNCONN 0      0        0.0.0.0:68             0.0.0.0:*          users:(("dhclient",pid=999,fd=6))',
].join('\n');

describe('parseSsOutput', () => {
  it('includes TCP sockets in the LISTEN state', () => {
    const usages = parseSsOutput(SAMPLE_SS_OUTPUT);

    const ssh = usages.find((usage) => usage.portNumber.value === 22);
    expect(ssh.protocol.value).toBe('TCP');
    expect(ssh.pid.value).toBe(1234);
    expect(ssh.processName).toBe('sshd');
  });

  it('excludes TCP sockets that are not LISTEN', () => {
    const usages = parseSsOutput(SAMPLE_SS_OUTPUT);

    expect(usages.some((usage) => usage.pid.value === 5678)).toBe(false);
  });

  it('includes UDP sockets regardless of state', () => {
    const usages = parseSsOutput(SAMPLE_SS_OUTPUT);

    const dhclient = usages.find((usage) => usage.portNumber.value === 68);
    expect(dhclient.protocol.value).toBe('UDP');
    expect(dhclient.pid.value).toBe(999);
    expect(dhclient.processName).toBe('dhclient');
  });

  it('ignores the header line', () => {
    expect(parseSsOutput('Netid State  Recv-Q Send-Q   Local Address:Port    Peer Address:Port  Process')).toEqual([]);
  });
});

describe('parseSsOutboundOutput', () => {
  const SAMPLE_SS_TNP_OUTPUT = [
    'Netid State  Recv-Q Send-Q   Local Address:Port    Peer Address:Port  Process',
    'tcp   ESTAB  0      0        192.168.1.5:45678     93.184.216.34:443  users:(("curl",pid=4321,fd=5))',
    'tcp   LISTEN 0      128      0.0.0.0:22            0.0.0.0:*          users:(("sshd",pid=1234,fd=3))',
  ].join('\n');

  it('includes only ESTABLISHED TCP rows', () => {
    const connections = parseSsOutboundOutput(SAMPLE_SS_TNP_OUTPUT);

    expect(connections).toHaveLength(1);
    expect(connections[0].localPort.value).toBe(45678);
    expect(connections[0].remoteAddress).toBe('93.184.216.34');
    expect(connections[0].remotePort.value).toBe(443);
    expect(connections[0].pid.value).toBe(4321);
    expect(connections[0].processName).toBe('curl');
  });

  it('excludes LISTEN rows', () => {
    const connections = parseSsOutboundOutput(SAMPLE_SS_TNP_OUTPUT);

    expect(connections.some((connection) => connection.pid.value === 1234)).toBe(false);
  });
});
