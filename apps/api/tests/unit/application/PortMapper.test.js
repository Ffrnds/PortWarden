const { PortMapper } = require('../../../src/application/mappers/PortMapper');
const { PortUsage } = require('../../../src/domain/entities/PortUsage');
const { PortNumber } = require('../../../src/domain/value-objects/PortNumber');
const { Protocol } = require('../../../src/domain/value-objects/Protocol');
const { ProcessId } = require('../../../src/domain/value-objects/ProcessId');

function buildPortUsage(portNumber) {
  return new PortUsage({
    portNumber: new PortNumber(portNumber),
    protocol: new Protocol('TCP'),
    pid: new ProcessId(1234),
    processName: 'node.exe',
  });
}

describe('PortMapper', () => {
  it('maps a PortUsage entity to a flat PortDTO', () => {
    const dto = PortMapper.toDTO(buildPortUsage(8080));

    expect(dto).toEqual({ port: 8080, protocol: 'TCP', pid: 1234, processName: 'node.exe' });
  });

  it('maps a list of PortUsage entities to a list of PortDTOs', () => {
    const dtos = PortMapper.toDTOList([buildPortUsage(8080), buildPortUsage(3000)]);

    expect(dtos.map((dto) => dto.port)).toEqual([8080, 3000]);
  });

  it('maps an empty list to an empty list', () => {
    expect(PortMapper.toDTOList([])).toEqual([]);
  });
});
