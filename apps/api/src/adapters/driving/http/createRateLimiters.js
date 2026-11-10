const { rateLimit } = require('express-rate-limit');

function jsonRateLimitHandler(req, res) {
  res.status(429).json({ error: 'Too many requests. Please try again in a moment.' });
}

// Express-native equivalent of @nestjs/throttler. Two tiers: a generous
// limit across the whole API (this is a single-user local tool, not a
// public service — the goal is catching a runaway client, not fending off
// abuse), and a tighter one specifically on the destructive kill endpoint.
// Both accept overrides so tests can shrink the limit instead of firing
// hundreds of requests to observe a 429.
function createGeneralRateLimiter(overrides = {}) {
  return rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: jsonRateLimitHandler,
    ...overrides,
  });
}

function createKillRateLimiter(overrides = {}) {
  return rateLimit({
    windowMs: 60_000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: jsonRateLimitHandler,
    ...overrides,
  });
}

module.exports = { createGeneralRateLimiter, createKillRateLimiter };
