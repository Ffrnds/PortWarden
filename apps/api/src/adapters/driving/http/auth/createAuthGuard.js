const jwt = require('jsonwebtoken');

// Express-native equivalent of a Nest Guard: middleware that verifies the
// Authorization: Bearer <token> header before letting a request reach a
// mutating route (kill/protect/unprotect). Read-only GET routes (including
// the WebSocket snapshot push) are intentionally left ungated — the goal is
// demonstrating the auth pattern on state-changing actions, not locking
// down a personal read-only status view.
function createAuthGuard(jwtSecret) {
  return function authGuard(req, res, next) {
    const header = req.get('authorization') || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
    }

    try {
      jwt.verify(token, jwtSecret);
      return next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }
  };
}

module.exports = { createAuthGuard };
