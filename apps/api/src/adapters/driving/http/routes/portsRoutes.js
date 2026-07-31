const { Router } = require('express');
const { createListPortsController } = require('../controllers/createListPortsController');
const { createKillPortController } = require('../controllers/createKillPortController');
const { createGetPortHistoryController } = require('../controllers/createGetPortHistoryController');
const { createProtectPortController } = require('../controllers/createProtectPortController');
const { createUnprotectPortController } = require('../controllers/createUnprotectPortController');
const { createListProtectedPortsController } = require('../controllers/createListProtectedPortsController');
const { createListOutboundConnectionsController } = require('../controllers/createListOutboundConnectionsController');
const { createListAlertsController } = require('../controllers/createListAlertsController');
const { createKillRateLimiter } = require('../createRateLimiters');
const { createAuthGuard } = require('../auth/createAuthGuard');

function createPortsRouter({
  listPortsUseCase,
  killPortUseCase,
  getPortHistoryUseCase,
  protectPortUseCase,
  unprotectPortUseCase,
  listProtectedPortsUseCase,
  listOutboundConnectionsUseCase,
  detectSuspiciousActivityUseCase,
  metrics,
  jwtSecret,
}) {
  const router = Router();
  const authGuard = createAuthGuard(jwtSecret);

  router.get('/ports', createListPortsController(listPortsUseCase));
  router.delete('/ports/:port', authGuard, createKillRateLimiter(), createKillPortController(killPortUseCase, metrics));
  router.get('/history', createGetPortHistoryController(getPortHistoryUseCase));
  router.put('/protection/:port', authGuard, createProtectPortController(protectPortUseCase));
  router.delete('/protection/:port', authGuard, createUnprotectPortController(unprotectPortUseCase));
  router.get('/protection', createListProtectedPortsController(listProtectedPortsUseCase));
  router.get('/connections', createListOutboundConnectionsController(listOutboundConnectionsUseCase));
  router.get('/alerts', createListAlertsController(detectSuspiciousActivityUseCase));

  return router;
}

module.exports = { createPortsRouter };
