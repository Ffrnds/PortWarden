const { Router } = require('express');
const { createListPortsController } = require('../controllers/createListPortsController');
const { createKillPortController } = require('../controllers/createKillPortController');
const { createGetPortHistoryController } = require('../controllers/createGetPortHistoryController');
const { createProtectPortController } = require('../controllers/createProtectPortController');
const { createUnprotectPortController } = require('../controllers/createUnprotectPortController');
const { createListProtectedPortsController } = require('../controllers/createListProtectedPortsController');
const { createListOutboundConnectionsController } = require('../controllers/createListOutboundConnectionsController');

function createPortsRouter({
  listPortsUseCase,
  killPortUseCase,
  getPortHistoryUseCase,
  protectPortUseCase,
  unprotectPortUseCase,
  listProtectedPortsUseCase,
  listOutboundConnectionsUseCase,
  metrics,
}) {
  const router = Router();

  router.get('/ports', createListPortsController(listPortsUseCase));
  router.delete('/ports/:port', createKillPortController(killPortUseCase, metrics));
  router.get('/history', createGetPortHistoryController(getPortHistoryUseCase));
  router.put('/protection/:port', createProtectPortController(protectPortUseCase));
  router.delete('/protection/:port', createUnprotectPortController(unprotectPortUseCase));
  router.get('/protection', createListProtectedPortsController(listProtectedPortsUseCase));
  router.get('/connections', createListOutboundConnectionsController(listOutboundConnectionsUseCase));

  return router;
}

module.exports = { createPortsRouter };
