const { KillPortRequestDTO } = require('../../../../application/dto/KillPortRequestDTO');
const { PortNumber } = require('../../../../domain/value-objects/PortNumber');
const { Protocol } = require('../../../../domain/value-objects/Protocol');
const { parsePortParam, ValidationError } = require('../validators/parsePortParam');

function createKillPortController(killPortUseCase, metricsAdapter) {
  return async function killPortController(req, res, next) {
    try {
      const dto = new KillPortRequestDTO({
        portNumber: parsePortParam(req.params.port),
        protocol: req.query.protocol ?? 'TCP',
      });

      let portNumber;
      let protocol;
      try {
        portNumber = new PortNumber(dto.portNumber);
        protocol = new Protocol(dto.protocol);
      } catch (error) {
        throw new ValidationError(error.message);
      }

      const event = await killPortUseCase.execute({ portNumber, protocol });
      metricsAdapter.recordTermination();

      res.status(200).json({
        port: event.portUsage.portNumber.value,
        protocol: event.portUsage.protocol.value,
        pid: event.portUsage.pid.value,
        processName: event.portUsage.processName,
        occurredAt: event.occurredAt.toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { createKillPortController };
