import { Router } from 'express';
import { listSourcesController } from '../controllers/sources.controller.js';

const router = Router();
router.get('/sources', listSourcesController);

export default router;
