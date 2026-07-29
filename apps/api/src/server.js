const express = require('express');
const cors = require('cors');
const { env } = require('./config/env');
const { buildCompositionRoot } = require('./config/composition-root');
const { createPortsRouter } = require('./adapters/driving/http/routes/portsRoutes');
const { errorHandler } = require('./adapters/driving/http/errorHandler');
const { setupSwagger } = require('./adapters/driving/http/swagger/swagger');

function createApp(config = env) {
  const useCases = buildCompositionRoot(config);

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', createPortsRouter(useCases));
  setupSwagger(app);
  app.use(errorHandler);

  return { app, close: () => useCases.close() };
}

if (require.main === module) {
  const { app } = createApp();
  app.listen(env.port, () => {
    console.log(`Port Manager API listening on http://localhost:${env.port}`);
  });
}

module.exports = { createApp };
