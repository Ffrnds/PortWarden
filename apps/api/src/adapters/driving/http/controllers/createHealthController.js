// Liveness/readiness split follows the same convention Kubernetes and
// libraries like @godaddy/terminus (the Express-world equivalent of
// @nestjs/terminus) use: liveness answers "is the process alive at all"
// (never fails while the event loop is running), readiness answers "can it
// actually serve requests" (fails if a real dependency, like the database,
// is unreachable).
function createLivenessController() {
  return function livenessController(req, res) {
    res.status(200).json({
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  };
}

function createReadinessController({ portHistoryRepository }) {
  return function readinessController(req, res) {
    const checks = {};
    let ready = true;

    try {
      portHistoryRepository.ping();
      checks.database = { status: 'ok' };
    } catch (error) {
      ready = false;
      checks.database = { status: 'error', message: error.message };
    }

    res.status(ready ? 200 : 503).json({
      status: ready ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      checks,
    });
  };
}

module.exports = { createLivenessController, createReadinessController };
