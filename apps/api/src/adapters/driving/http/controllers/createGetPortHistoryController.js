function createGetPortHistoryController(getPortHistoryUseCase) {
  return async function getPortHistoryController(req, res, next) {
    try {
      const events = await getPortHistoryUseCase.execute();

      res.json(
        events.map((event) => ({
          port: event.portUsage.portNumber.value,
          protocol: event.portUsage.protocol.value,
          pid: event.portUsage.pid.value,
          processName: event.portUsage.processName,
          occurredAt: event.occurredAt.toISOString(),
        }))
      );
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { createGetPortHistoryController };
