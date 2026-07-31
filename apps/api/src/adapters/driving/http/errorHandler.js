const { ProtectedPortError } = require('../../../domain/exceptions/ProtectedPortError');
const { InsufficientPrivilegeError } = require('../../../domain/exceptions/InsufficientPrivilegeError');
const { ValidationError } = require('./validators/parsePortParam');

function createErrorHandler(logger) {
  // eslint-disable-next-line no-unused-vars
  return function errorHandler(error, req, res, next) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }

    if (error instanceof ProtectedPortError) {
      return res.status(403).json({ error: error.message, port: error.portNumber.value });
    }

    if (error instanceof InsufficientPrivilegeError) {
      return res.status(409).json({ error: error.message, code: 'INSUFFICIENT_PRIVILEGE', pid: error.pid.value });
    }

    // KillPortUseCase doesn't have a typed exception for "port not in use" yet
    // (see ARCHITECTURE.md) — matched by message as an interim measure.
    if (/No process found/.test(error.message)) {
      return res.status(404).json({ error: error.message });
    }

    // Everything above is an expected business/validation outcome — this is
    // the branch that means something actually went wrong.
    logger.error(error.message, { stack: error.stack, path: req.originalUrl, method: req.method });
    return res.status(500).json({ error: 'Internal server error' });
  };
}

module.exports = { createErrorHandler };
