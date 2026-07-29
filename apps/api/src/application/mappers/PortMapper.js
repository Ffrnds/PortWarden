const { PortDTO } = require('../dto/PortDTO');

class PortMapper {
  static toDTO(portUsage) {
    return new PortDTO({
      port: portUsage.portNumber.value,
      protocol: portUsage.protocol.value,
      pid: portUsage.pid.value,
      processName: portUsage.processName,
    });
  }

  static toDTOList(portUsages) {
    return portUsages.map((portUsage) => PortMapper.toDTO(portUsage));
  }
}

module.exports = { PortMapper };
