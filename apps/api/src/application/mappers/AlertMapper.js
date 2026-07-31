const { AlertDTO } = require('../dto/AlertDTO');

class AlertMapper {
  static toDTO({ subject, kind, reasons }) {
    if (kind === 'listening') {
      return new AlertDTO({
        type: 'listening',
        port: subject.portNumber.value,
        protocol: subject.protocol.value,
        pid: subject.pid.value,
        processName: subject.processName,
        reasons,
      });
    }

    return new AlertDTO({
      type: 'outbound',
      localPort: subject.localPort.value,
      remoteAddress: subject.remoteAddress,
      remoteHost: subject.remoteHost,
      remotePort: subject.remotePort.value,
      pid: subject.pid.value,
      processName: subject.processName,
      reasons,
    });
  }

  static toDTOList(alerts) {
    return alerts.map((alert) => AlertMapper.toDTO(alert));
  }
}

module.exports = { AlertMapper };
