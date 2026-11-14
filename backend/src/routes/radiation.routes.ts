import { Router } from 'express';
import { listRadiationEventsController } from '../controllers/radiation.controller.js';

const router = Router();
router.get('/radiation/events', listRadiationEventsController);

export default router;
