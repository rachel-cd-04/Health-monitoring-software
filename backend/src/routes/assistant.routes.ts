import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { assistantChatController } from '../controllers/assistant.controller.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();
// MOD-01: public (optional auth) and backed by a paid API, so each client gets 20 questions per minute.
const assistantRateLimit = rateLimit({ windowMs: 60000, limit: 20 });

router.post('/assistant/chat', assistantRateLimit, optionalAuth, assistantChatController);

export default router;
