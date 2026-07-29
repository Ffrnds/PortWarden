const client = require('prom-client');

class PromClientMetricsAdapter {
  #registry;
  #terminatedCounter;

  constructor() {
    this.#registry = new client.Registry();
    this.#terminatedCounter = new client.Counter({
      name: 'port_manager_processes_terminated_total',
      help: 'Total number of processes terminated via Port Manager',
      registers: [this.#registry],
    });
  }

  recordTermination() {
    this.#terminatedCounter.inc();
  }

  async metrics() {
    return this.#registry.metrics();
  }

  get contentType() {
    return this.#registry.contentType;
  }
}

module.exports = { PromClientMetricsAdapter };
