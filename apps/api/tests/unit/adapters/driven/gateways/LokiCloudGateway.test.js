const { LokiCloudGateway } = require('../../../../../src/adapters/driven/gateways/LokiCloudGateway');
const { ProcessTerminatedEvent } = require('../../../../../src/domain/events/ProcessTerminatedEvent');
const { PortUsage } = require('../../../../../src/domain/entities/PortUsage');
const { PortNumber } = require('../../../../../src/domain/value-objects/PortNumber');
const { Protocol } = require('../../../../../src/domain/value-objects/Protocol');
const { ProcessId } = require('../../../../../src/domain/value-objects/ProcessId');

// This adapter's whole job is talking to a real paid cloud service. Unlike
// our OS-level adapters (safe and free to run for real), hitting an actual
// Grafana Cloud endpoint from an automated test suite would be slow, flaky,
// and require live credentials — so `fetch` is faked here on purpose.
function buildEvent() {
  const usage = new PortUsage({
    portNumber: new PortNumber(8080),
    protocol: new Protocol('TCP'),
    pid: new ProcessId(1234),
    processName: 'node.exe',
  });
  return new ProcessTerminatedEvent(usage, new Date('2026-07-29T12:00:00.000Z'));
}

describe('LokiCloudGateway', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('pushes the event as a Loki log stream with basic auth', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    const gateway = new LokiCloudGateway({ pushUrl: 'https://loki.example.com/loki/api/v1/push', username: 'user', apiKey: 'key' });
    await gateway.recordEvent(buildEvent());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://loki.example.com/loki/api/v1/push');
    expect(options.headers.Authorization).toBe(`Basic ${Buffer.from('user:key').toString('base64')}`);

    const body = JSON.parse(options.body);
    expect(body.streams[0].stream).toEqual({ app: 'port-manager', event: 'process_terminated' });
    expect(JSON.parse(body.streams[0].values[0][1])).toEqual({
      port: 8080,
      protocol: 'TCP',
      pid: 1234,
      processName: 'node.exe',
    });
  });

  it('throws when Loki responds with a non-ok status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' }));

    const gateway = new LokiCloudGateway({ pushUrl: 'https://loki.example.com', username: 'user', apiKey: 'key' });

    await expect(gateway.recordEvent(buildEvent())).rejects.toThrow(/500/);
  });
});
