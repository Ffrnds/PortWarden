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
});
