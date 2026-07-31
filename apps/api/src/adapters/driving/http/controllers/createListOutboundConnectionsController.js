const { OutboundConnectionMapper } = require('../../../../application/mappers/OutboundConnectionMapper');

function createListOutboundConnectionsController(listOutboundConnectionsUseCase) {
  return async function listOutboundConnectionsController(req, res, next) {
    try {
      const connections = await listOutboundConnectionsUseCase.execute();
      res.json(OutboundConnectionMapper.toDTOList(connections));
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { createListOutboundConnectionsController };
