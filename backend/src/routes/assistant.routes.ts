import { Router } from 'express';
import { assistantChatController } from '../controllers/assistant.controller.js';
import { requireAuth, requireSelf } from '../middleware/auth.js';

const router = Router();
router.post('/assistant/chat', requireAuth, requireSelf, assistantChatController);

export default router;
