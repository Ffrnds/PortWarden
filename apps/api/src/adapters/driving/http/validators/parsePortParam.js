class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

function parsePortParam(rawValue) {
  const parsed = Number(rawValue);

  if (!Number.isInteger(parsed)) {
    throw new ValidationError(`Invalid port: "${rawValue}". Must be an integer.`);
  }

  return parsed;
}

module.exports = { parsePortParam, ValidationError };
