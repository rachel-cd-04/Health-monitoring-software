import { Router } from 'express';
import {
  createCheckinController,
  createMeasurementController,
  getHistoryController,
  listCheckinsController,
  getRoutineController,
  getStatusController,
  listAstronautsController,
  updateRoutineController,
} from '../controllers/astronauts.controller.js';
import { requireAuth, requireSelf } from '../middleware/auth.js';

const router = Router();

router.get('/astronauts', listAstronautsController);
router.post('/measurements', requireAuth, requireSelf, createMeasurementController);
router.post('/checkins', requireAuth, requireSelf, createCheckinController);
router.get('/astronauts/:id/checkins', requireAuth, requireSelf, listCheckinsController);
router.get('/astronauts/:id/status', requireAuth, requireSelf, getStatusController);
router.get('/astronauts/:id/history', requireAuth, requireSelf, getHistoryController);
router.get('/astronauts/:id/routine', requireAuth, requireSelf, getRoutineController);
router.patch('/astronauts/:id/routine/:item_id', requireAuth, requireSelf, updateRoutineController);

export default router;
