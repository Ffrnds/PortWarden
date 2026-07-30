function createMetricsController(metricsAdapter) {
  return async function metricsController(req, res, next) {
    try {
      const body = await metricsAdapter.metrics();
      res.set('Content-Type', metricsAdapter.contentType);
      res.send(body);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { createMetricsController };
