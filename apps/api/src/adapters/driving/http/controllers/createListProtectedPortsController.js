function createListProtectedPortsController(listProtectedPortsUseCase) {
  return async function listProtectedPortsController(req, res, next) {
    try {
      const protectedPorts = await listProtectedPortsUseCase.execute();
      res.json(protectedPorts.map((portNumber) => portNumber.value));
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { createListProtectedPortsController };
