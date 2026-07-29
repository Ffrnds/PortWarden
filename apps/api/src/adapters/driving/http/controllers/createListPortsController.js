const { PortMapper } = require('../../../../application/mappers/PortMapper');

function createListPortsController(listPortsUseCase) {
  return async function listPortsController(req, res, next) {
    try {
      const usages = await listPortsUseCase.execute();
      res.json(PortMapper.toDTOList(usages));
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { createListPortsController };
