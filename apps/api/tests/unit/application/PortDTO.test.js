const { PortDTO } = require('../../../src/application/dto/PortDTO');
const { PortUsage } = require('../../../src/domain/entities/PortUsage');
const { PortNumber } = require('../../../src/domain/value-objects/PortNumber');
const { Protocol } = require('../../../src/domain/value-objects/Protocol');
const { ProcessId } = require('../../../src/domain/value-objects/ProcessId');

describe('PortDTO', () => {
  it('holds plain primitive fields', () => {
    const dto = new PortDTO({
      port: 8080,
      protocol: 'TCP',
      pid: 1234,
      processName: 'node.exe',
      executablePath: 'C:\\Program Files\\nodejs\\node.exe',
    });

    expect(dto).toEqual({
      port: 8080,
      protocol: 'TCP',
      pid: 1234,
      processName: 'node.exe',
      executablePath: 'C:\\Program Files\\nodejs\\node.exe',
    });
  });

  it('serializes to the expected JSON shape, unlike the domain entity it represents', () => {
    const usage = new PortUsage({
      portNumber: new PortNumber(8080),
      protocol: new Protocol('TCP'),
      pid: new ProcessId(1234),
      processName: 'node.exe',
    });
    const dto = new PortDTO({
      port: usage.portNumber.value,
      protocol: usage.protocol.value,
      pid: usage.pid.value,
      processName: usage.processName,
      executablePath: usage.executablePath,
    });

    // The domain entity's private fields (#portNumber, #protocol, #pid) are not
    // enumerable, so serializing it directly would produce an empty object —
    // this is exactly why a DTO exists to cross the HTTP boundary.
    expect(JSON.parse(JSON.stringify(usage))).toEqual({});
    expect(JSON.parse(JSON.stringify(dto))).toEqual({
      port: 8080,
      protocol: 'TCP',
      pid: 1234,
      processName: 'node.exe',
      executablePath: null,
    });
  });
});
