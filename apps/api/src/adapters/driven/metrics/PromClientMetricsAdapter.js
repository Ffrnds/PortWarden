const client = require('prom-client');

class PromClientMetricsAdapter {
  #registry;
  #terminatedCounter;
  #httpRequestsTotal;
  #httpRequestDuration;

  constructor() {
    this.#registry = new client.Registry();
    this.#terminatedCounter = new client.Counter({
      name: 'port_manager_processes_terminated_total',
      help: 'Total number of processes terminated via Port Manager',
      registers: [this.#registry],
    });
    this.#httpRequestsTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests received',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.#registry],
    });
    this.#httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      // Tuned for a local API: mostly sub-100ms, but real netstat/tasklist
      // calls (list/kill) can run into multiple seconds.
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.#registry],
    });
    // Free Node.js runtime metrics (CPU, memory, event loop lag, GC) —
    // built into prom-client, no extra dependency.
    client.collectDefaultMetrics({ register: this.#registry });
  }

  recordTermination() {
    this.#terminatedCounter.inc();
  }

  recordHttpRequest({ method, route, statusCode, durationSeconds }) {
    const labels = { method, route, status_code: String(statusCode) };
    this.#httpRequestsTotal.inc(labels);
    this.#httpRequestDuration.observe(labels, durationSeconds);
  }

  async metrics() {
    return this.#registry.metrics();
  }

  get contentType() {
    return this.#registry.contentType;
  }
}

module.exports = { PromClientMetricsAdapter };
