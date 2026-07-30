const { OutboundConnectionMapper } = require('../../../src/application/mappers/OutboundConnectionMapper');
const { OutboundConnection } = require('../../../src/domain/entities/OutboundConnection');
const { PortNumber } = require('../../../src/domain/value-objects/PortNumber');
const { Protocol } = require('../../../src/domain/value-objects/Protocol');
const { ProcessId } = require('../../../src/domain/value-objects/ProcessId');

function buildConnection(overrides = {}) {
  return new OutboundConnection({
    localPort: new PortNumber(51234),
    protocol: new Protocol('TCP'),
    remoteAddress: '142.250.72.14',
    remotePort: new PortNumber(443),
    pid: new ProcessId(4112),
    processName: 'msedge.exe',
    ...overrides,
  });
}

describe('OutboundConnectionMapper', () => {
  it('maps an OutboundConnection entity to a flat DTO', () => {
    const dto = OutboundConnectionMapper.toDTO(buildConnection({ remoteHost: 'google.com' }));

    expect(dto).toEqual({
      localPort: 51234,
      protocol: 'TCP',
      remoteAddress: '142.250.72.14',
      remotePort: 443,
      remoteHost: 'google.com',
      pid: 4112,
      processName: 'msedge.exe',
      executablePath: null,
    });
  });

  it('maps a list', () => {
    const dtos = OutboundConnectionMapper.toDTOList([buildConnection(), buildConnection({ remotePort: new PortNumber(80) })]);

    expect(dtos.map((dto) => dto.remotePort)).toEqual([443, 80]);
  });
});
