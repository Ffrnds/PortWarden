const { AlertMapper } = require('../../../../application/mappers/AlertMapper');

function createListAlertsController(detectSuspiciousActivityUseCase) {
  return async function listAlertsController(req, res, next) {
    try {
      const alerts = await detectSuspiciousActivityUseCase.execute();
      res.json(AlertMapper.toDTOList(alerts));
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { createListAlertsController };
