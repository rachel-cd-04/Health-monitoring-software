import { Router } from 'express';
import { getCrewAlertsController, getCrewOverviewController } from '../controllers/crew.controller.js';
import { requireAuth, requireCommander } from '../middleware/auth.js';

const router = Router();

router.get('/crew/overview', getCrewOverviewController);
router.get('/crew/alerts', requireAuth, requireCommander, getCrewAlertsController);

export default router;
