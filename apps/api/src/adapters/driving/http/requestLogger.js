function createRequestLogger(logger) {
  return function requestLogger(req, res, next) {
    const startedAt = Date.now();

    res.on('finish', () => {
      logger.info('request completed', {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
      });
    });

    next();
  };
}

module.exports = { createRequestLogger };
