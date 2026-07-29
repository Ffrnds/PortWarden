const { ObservabilityGatewayPort } = require('../../../domain/ports/outbound/ObservabilityGatewayPort');

// Not wired into composition-root yet — Grafana Cloud is a future phase
// (see ARCHITECTURE.md). Kept ready so switching from
// InMemoryObservabilityGateway is a one-line change, not a rewrite.
class LokiCloudGateway extends ObservabilityGatewayPort {
  #pushUrl;
  #headers;

  constructor({ pushUrl, username, apiKey }) {
    super();
    this.#pushUrl = pushUrl;
    this.#headers = {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${username}:${apiKey}`).toString('base64')}`,
    };
  }

  async recordEvent(event) {
    const timestampNs = String(event.occurredAt.getTime() * 1_000_000);
    const line = JSON.stringify({
      port: event.portUsage.portNumber.value,
      protocol: event.portUsage.protocol.value,
      pid: event.portUsage.pid.value,
      processName: event.portUsage.processName,
    });

    const response = await fetch(this.#pushUrl, {
      method: 'POST',
      headers: this.#headers,
      body: JSON.stringify({
        streams: [
          {
            stream: { app: 'port-manager', event: 'process_terminated' },
            values: [[timestampNs, line]],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`LokiCloudGateway failed to push: ${response.status} ${response.statusText}`);
    }
  }
}

module.exports = { LokiCloudGateway };
