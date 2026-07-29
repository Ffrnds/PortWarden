const { Router } = require('express');
const { createListPortsController } = require('../controllers/createListPortsController');
const { createKillPortController } = require('../controllers/createKillPortController');
const { createGetPortHistoryController } = require('../controllers/createGetPortHistoryController');
const { createProtectPortController } = require('../controllers/createProtectPortController');
const { createListProtectedPortsController } = require('../controllers/createListProtectedPortsController');

function createPortsRouter({
  listPortsUseCase,
  killPortUseCase,
  getPortHistoryUseCase,
  protectPortUseCase,
  listProtectedPortsUseCase,
}) {
  const router = Router();

  router.get('/ports', createListPortsController(listPortsUseCase));
  router.delete('/ports/:port', createKillPortController(killPortUseCase));
  router.get('/history', createGetPortHistoryController(getPortHistoryUseCase));
  router.put('/protection/:port', createProtectPortController(protectPortUseCase));
  router.get('/protection', createListProtectedPortsController(listProtectedPortsUseCase));

  return router;
}

module.exports = { createPortsRouter };
