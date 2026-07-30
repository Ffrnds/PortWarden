const { PortNumber } = require('../../../../domain/value-objects/PortNumber');
const { parsePortParam, ValidationError } = require('../validators/parsePortParam');

function createUnprotectPortController(unprotectPortUseCase) {
  return async function unprotectPortController(req, res, next) {
    try {
      const rawPort = parsePortParam(req.params.port);

      let portNumber;
      try {
        portNumber = new PortNumber(rawPort);
      } catch (error) {
        throw new ValidationError(error.message);
      }

      await unprotectPortUseCase.execute({ portNumber });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { createUnprotectPortController };
