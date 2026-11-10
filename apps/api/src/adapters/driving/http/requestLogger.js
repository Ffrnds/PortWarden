function createRequestLogger(logger, metricsAdapter) {
  return function requestLogger(req, res, next) {
    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      // req.route.path is the matched pattern (e.g. "/ports/:port"), not the
      // real URL — using the raw path instead would blow up Prometheus label
      // cardinality with one series per port number ever requested.
      const route = req.route ? `${req.baseUrl}${req.route.path}` : req.path;

      logger.info('request completed', {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
      });

      metricsAdapter.recordHttpRequest({
        method: req.method,
        route,
        statusCode: res.statusCode,
        durationSeconds: durationMs / 1000,
      });
    });

    next();
  };
}

module.exports = { createRequestLogger };
