import { Router } from 'express';
import {
  closeEmergencyController,
  createEmergencyController,
  createEmergencyStepController,
  emergencyRateLimit,
  getEmergencyContextController,
  getEmergencySummaryController,
} from '../controllers/emergency.controller.js';

const router = Router();

router.post('/emergency', emergencyRateLimit, createEmergencyController);
router.get('/emergency/:id/context', emergencyRateLimit, getEmergencyContextController);
router.post('/emergency/:id/steps', emergencyRateLimit, createEmergencyStepController);
router.patch('/emergency/:id/close', emergencyRateLimit, closeEmergencyController);
router.get('/emergency/:id/summary', emergencyRateLimit, getEmergencySummaryController);

export default router;
