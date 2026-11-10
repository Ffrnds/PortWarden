const express = require('express');
const cors = require('cors');
const { env } = require('./config/env');
const { buildCompositionRoot } = require('./config/composition-root');
const { createPortsRouter } = require('./adapters/driving/http/routes/portsRoutes');
const { createErrorHandler } = require('./adapters/driving/http/errorHandler');
const { createRequestLogger } = require('./adapters/driving/http/requestLogger');
const { createMetricsController } = require('./adapters/driving/http/controllers/createMetricsController');
const {
  createLivenessController,
  createReadinessController,
} = require('./adapters/driving/http/controllers/createHealthController');
const { createGeneralRateLimiter } = require('./adapters/driving/http/createRateLimiters');
const { createPortsWebSocketServer } = require('./adapters/driving/websocket/createPortsWebSocketServer');
const { createLoginController } = require('./adapters/driving/http/auth/createLoginController');
const { setupSwagger } = require('./adapters/driving/http/swagger/swagger');
const { PinoLoggerAdapter } = require('./adapters/driven/logging/PinoLoggerAdapter');
const { PromClientMetricsAdapter } = require('./adapters/driven/metrics/PromClientMetricsAdapter');

function createApp(config = env) {
  const useCases = buildCompositionRoot(config);
  const logger = new PinoLoggerAdapter();
  const metrics = new PromClientMetricsAdapter();
  // Falls back to the shared env module rather than requiring every caller
  // to pass these explicitly — tests that only override e.g. databasePath
  // (a partial config object replaces env.js's defaults entirely, since
  // this is a plain default parameter, not a merge) still get a real,
  // consistent secret/key instead of undefined.
  const jwtSecret = config.jwtSecret || env.jwtSecret;
  const adminAccessKey = config.adminAccessKey || env.adminAccessKey;

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(createRequestLogger(logger, metrics));
  app.use('/api', createGeneralRateLimiter());
  app.post('/api/auth/login', createLoginController({ adminAccessKey, jwtSecret }));
  app.use('/api', createPortsRouter({ ...useCases, metrics, jwtSecret }));
  app.get('/metrics', createMetricsController(metrics));
  app.get('/health/live', createLivenessController());
  app.get('/health/ready', createReadinessController({ portHistoryRepository: useCases.portHistoryRepository }));
  setupSwagger(app);
  app.use(createErrorHandler(logger));

  return {
    app,
    close: () => useCases.close(),
    adminAccessKey,
    // Needs the underlying http.Server (for the WebSocket upgrade
    // handshake), which only exists once something calls app.listen() — so
    // this is a function the caller invokes after that, not something
    // createApp can wire up on its own.
    attachWebSocket: (httpServer) => createPortsWebSocketServer(httpServer, { ...useCases, logger }),
  };
}

if (require.main === module) {
  const { app, attachWebSocket } = createApp();
  const httpServer = app.listen(env.port, () => {
    console.log(`Port Manager API listening on http://localhost:${env.port}`);
  });
  attachWebSocket(httpServer);
}

module.exports = { createApp };
