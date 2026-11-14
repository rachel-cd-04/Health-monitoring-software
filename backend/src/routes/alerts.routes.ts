import { Router } from 'express';
import { acknowledgeAlertController } from '../controllers/alerts.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.patch('/alerts/:id/acknowledge', requireAuth, acknowledgeAlertController);

export default router;
