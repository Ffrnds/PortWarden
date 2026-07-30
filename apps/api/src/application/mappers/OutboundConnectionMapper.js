const { OutboundConnectionDTO } = require('../dto/OutboundConnectionDTO');

class OutboundConnectionMapper {
  static toDTO(connection) {
    return new OutboundConnectionDTO({
      localPort: connection.localPort.value,
      protocol: connection.protocol.value,
      remoteAddress: connection.remoteAddress,
      remotePort: connection.remotePort.value,
      remoteHost: connection.remoteHost,
      pid: connection.pid.value,
      processName: connection.processName,
      executablePath: connection.executablePath,
    });
  }

  static toDTOList(connections) {
    return connections.map((connection) => OutboundConnectionMapper.toDTO(connection));
  }
}

module.exports = { OutboundConnectionMapper };
