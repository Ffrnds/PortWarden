const jwt = require('jsonwebtoken');

// Express-native equivalent of a Nest AuthController issuing a JWT. There's
// no user database here — this is a single-user desktop tool, so "login"
// just means "prove you were handed the per-launch access key" (see
// src/config/env.js). No sessions, no refresh tokens: apps/web fetches one
// token on startup and holds it in memory for the process's lifetime.
function createLoginController({ adminAccessKey, jwtSecret }) {
  return function loginController(req, res) {
    const { accessKey } = req.body || {};

    if (accessKey !== adminAccessKey) {
      return res.status(401).json({ error: 'Invalid access key.' });
    }

    const token = jwt.sign({ sub: 'admin' }, jwtSecret, { expiresIn: '24h' });
    return res.status(200).json({ token });
  };
}

module.exports = { createLoginController };
