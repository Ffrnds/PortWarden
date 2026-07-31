const { AlertMapper } = require('../../../src/application/mappers/AlertMapper');
const { PortUsage } = require('../../../src/domain/entities/PortUsage');
const { OutboundConnection } = require('../../../src/domain/entities/OutboundConnection');
const { PortNumber } = require('../../../src/domain/value-objects/PortNumber');
const { Protocol } = require('../../../src/domain/value-objects/Protocol');
const { ProcessId } = require('../../../src/domain/value-objects/ProcessId');

describe('AlertMapper', () => {
  it('maps a listening alert to a flat DTO', () => {
    const usage = new PortUsage({
      portNumber: new PortNumber(31337),
      protocol: new Protocol('TCP'),
      pid: new ProcessId(1234),
      processName: 'node.exe',
    });

    const dto = AlertMapper.toDTO({ subject: usage, kind: 'listening', reasons: ['reason'] });

    expect(dto).toEqual({
      type: 'listening',
      port: 31337,
      protocol: 'TCP',
      localPort: undefined,
      remoteAddress: undefined,
      remoteHost: undefined,
      remotePort: undefined,
      pid: 1234,
      processName: 'node.exe',
      reasons: ['reason'],
    });
  });

  it('maps an outbound alert to a flat DTO', () => {
    const connection = new OutboundConnection({
      localPort: new PortNumber(51234),
      protocol: new Protocol('TCP'),
      remoteAddress: '203.0.113.5',
      remotePort: new PortNumber(4444),
      pid: new ProcessId(4112),
      processName: 'node.exe',
      remoteHost: 'example.com',
    });

    const dto = AlertMapper.toDTO({ subject: connection, kind: 'outbound', reasons: ['reason'] });

    expect(dto).toEqual({
      type: 'outbound',
      port: undefined,
      protocol: undefined,
      localPort: 51234,
      remoteAddress: '203.0.113.5',
      remoteHost: 'example.com',
      remotePort: 4444,
      pid: 4112,
      processName: 'node.exe',
      reasons: ['reason'],
    });
  });

  it('maps a list', () => {
    const usage = new PortUsage({
      portNumber: new PortNumber(31337),
      protocol: new Protocol('TCP'),
      pid: new ProcessId(1234),
      processName: 'node.exe',
    });

    const dtos = AlertMapper.toDTOList([{ subject: usage, kind: 'listening', reasons: ['a'] }]);

    expect(dtos).toHaveLength(1);
  });
});
