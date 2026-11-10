const { PromClientMetricsAdapter } = require('../../../../../src/adapters/driven/metrics/PromClientMetricsAdapter');

describe('PromClientMetricsAdapter', () => {
  it('starts the terminated-processes counter at zero', async () => {
    const adapter = new PromClientMetricsAdapter();

    const text = await adapter.metrics();

    expect(text).toContain('port_manager_processes_terminated_total 0');
  });

  it('increments the counter each time a termination is recorded', async () => {
    const adapter = new PromClientMetricsAdapter();

    adapter.recordTermination();
    adapter.recordTermination();

    const text = await adapter.metrics();
    expect(text).toContain('port_manager_processes_terminated_total 2');
  });

  it('exposes the Prometheus text content type', () => {
    const adapter = new PromClientMetricsAdapter();

    expect(adapter.contentType).toContain('text/plain');
  });

  it('also exposes default Node.js runtime metrics (memory, CPU, event loop)', async () => {
    const adapter = new PromClientMetricsAdapter();

    const text = await adapter.metrics();

    expect(text).toContain('process_resident_memory_bytes');
  });

  it('records an HTTP request as both a counter and a duration observation', async () => {
    const adapter = new PromClientMetricsAdapter();

    adapter.recordHttpRequest({ method: 'GET', route: '/ports', statusCode: 200, durationSeconds: 0.042 });

    const text = await adapter.metrics();
    expect(text).toContain('http_requests_total{method="GET",route="/ports",status_code="200"} 1');
    expect(text).toContain('http_request_duration_seconds_count{method="GET",route="/ports",status_code="200"} 1');
  });

  it('keeps separate label series for different routes/methods/status codes', async () => {
    const adapter = new PromClientMetricsAdapter();

    adapter.recordHttpRequest({ method: 'GET', route: '/ports', statusCode: 200, durationSeconds: 0.01 });
    adapter.recordHttpRequest({ method: 'DELETE', route: '/ports/:port', statusCode: 403, durationSeconds: 0.02 });

    const text = await adapter.metrics();
    expect(text).toContain('http_requests_total{method="GET",route="/ports",status_code="200"} 1');
    expect(text).toContain('http_requests_total{method="DELETE",route="/ports/:port",status_code="403"} 1');
  });
});
