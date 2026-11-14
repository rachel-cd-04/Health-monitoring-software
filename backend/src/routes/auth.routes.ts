import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { loginController } from '../controllers/auth.controller.js';

const router = Router();
const loginRateLimit = rateLimit({ windowMs: 30000, limit: 20 });

router.post('/auth/login', loginRateLimit, loginController);

export default router;
