const { DetectSuspiciousActivityPort } = require('../../domain/ports/inbound/DetectSuspiciousActivityPort');
const { PortInspectorPort } = require('../../domain/ports/outbound/PortInspectorPort');
const { NotifierPort } = require('../../domain/ports/outbound/NotifierPort');
const { SuspiciousActivityPolicy } = require('../../domain/services/SuspiciousActivityPolicy');

class DetectSuspiciousActivityUseCase extends DetectSuspiciousActivityPort {
  #portInspector;
  #notifier;
  // In-memory, per-process — resets on every API restart. That's the right
  // trade-off for a personal desktop tool: it stops the same finding from
  // re-notifying every 5s poll for as long as the app stays open, without
  // needing a persistence layer just for notification de-duplication.
  #notifiedKeys = new Set();

  constructor(portInspector, notifier) {
    super();

    if (!(portInspector instanceof PortInspectorPort)) {
      throw new Error('DetectSuspiciousActivityUseCase requires a PortInspectorPort instance.');
    }
    if (!(notifier instanceof NotifierPort)) {
      throw new Error('DetectSuspiciousActivityUseCase requires a NotifierPort instance.');
    }

    this.#portInspector = portInspector;
    this.#notifier = notifier;
  }

  async execute() {
    const [usages, connections] = await Promise.all([
      this.#portInspector.listActivePorts(),
      this.#portInspector.listOutboundConnections(),
    ]);

    const alerts = [
      ...usages
        .map((subject) => ({ subject, kind: 'listening', reasons: SuspiciousActivityPolicy.evaluatePortUsage(subject) }))
        .filter((alert) => alert.reasons.length > 0),
      ...connections
        .map((subject) => ({ subject, kind: 'outbound', reasons: SuspiciousActivityPolicy.evaluateConnection(subject) }))
        .filter((alert) => alert.reasons.length > 0),
    ];

    await this.#notifyNewAlerts(alerts);

    return alerts;
  }

  async #notifyNewAlerts(alerts) {
    const newAlerts = alerts.filter((alert) => !this.#notifiedKeys.has(this.#alertKey(alert)));

    await Promise.all(
      newAlerts.map(async (alert) => {
        this.#notifiedKeys.add(this.#alertKey(alert));
        // Best-effort: a failed toast (e.g. notifications disabled) shouldn't
        // fail the whole request — the alert is still returned in the
        // response either way.
        await this.#notifier.notify(alert.reasons[0]).catch(() => {});
      })
    );
  }

  #alertKey(alert) {
    return alert.kind === 'listening'
      ? `listening:${alert.subject.portNumber.value}/${alert.subject.protocol.value}:${alert.subject.pid.value}`
      : `outbound:${alert.subject.localPort.value}:${alert.subject.remoteAddress}:${alert.subject.remotePort.value}`;
  }
}

module.exports = { DetectSuspiciousActivityUseCase };
