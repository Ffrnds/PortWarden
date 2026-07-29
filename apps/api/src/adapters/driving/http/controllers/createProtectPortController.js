const { PortNumber } = require('../../../../domain/value-objects/PortNumber');
const { parsePortParam, ValidationError } = require('../validators/parsePortParam');

function createProtectPortController(protectPortUseCase) {
  return async function protectPortController(req, res, next) {
    try {
      const rawPort = parsePortParam(req.params.port);

      let portNumber;
      try {
        portNumber = new PortNumber(rawPort);
      } catch (error) {
        throw new ValidationError(error.message);
      }

      await protectPortUseCase.execute({ portNumber });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { createProtectPortController };
