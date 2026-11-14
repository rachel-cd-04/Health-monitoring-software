import { type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { type AuthRequest } from '../middleware/auth.js';
import { parseBody, runAssistant, idSchema, sendError } from './common.js';

export async function assistantChatController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = parseBody(z.object({ astronaut_id: idSchema, message: z.string().min(1).max(4000) }), req.body, res);
    if (!body) return;
    if (!process.env.MISTRAL_API_KEY) return sendError(res, 503, 'AI_UNAVAILABLE', 'The assistant is unavailable.');
    res.json(await runAssistant(body.message, body.astronaut_id));
  } catch (e) {
    next(e);
  }
}
