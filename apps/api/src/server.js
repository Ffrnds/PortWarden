const express = require('express');
const cors = require('cors');
const { env } = require('./config/env');
const { buildCompositionRoot } = require('./config/composition-root');
const { createPortsRouter } = require('./adapters/driving/http/routes/portsRoutes');
const { createErrorHandler } = require('./adapters/driving/http/errorHandler');
const { createRequestLogger } = require('./adapters/driving/http/requestLogger');
const { createMetricsController } = require('./adapters/driving/http/controllers/createMetricsController');
const { setupSwagger } = require('./adapters/driving/http/swagger/swagger');
const { PinoLoggerAdapter } = require('./adapters/driven/logging/PinoLoggerAdapter');
const { PromClientMetricsAdapter } = require('./adapters/driven/metrics/PromClientMetricsAdapter');

function createApp(config = env) {
  const useCases = buildCompositionRoot(config);
  const logger = new PinoLoggerAdapter();
  const metrics = new PromClientMetricsAdapter();

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(createRequestLogger(logger, metrics));
  app.use('/api', createPortsRouter({ ...useCases, metrics }));
  app.get('/metrics', createMetricsController(metrics));
  setupSwagger(app);
  app.use(createErrorHandler(logger));

  return { app, close: () => useCases.close() };
}

if (require.main === module) {
  const { app } = createApp();
  app.listen(env.port, () => {
    console.log(`Port Manager API listening on http://localhost:${env.port}`);
  });
}

module.exports = { createApp };
