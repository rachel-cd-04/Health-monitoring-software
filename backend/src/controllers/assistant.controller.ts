import { type NextFunction, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { type AuthRequest } from '../middleware/auth.js';
import { AssistantUnavailableError, runAssistant } from '../llm/assistant.js';
import { parseBody, sendError } from './common.js';

// MOD-01 (api-contract.md > POST /assistant/chat): the body is `{ message }` only. `.strict()` rejects an
// `astronaut_id` with 400: whose private data may be used comes exclusively from the optional JWT.
export const chatBodySchema = z.object({ message: z.string().trim().min(1).max(2000) }).strict();

export async function assistantChatController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = parseBody(chatBodySchema, req.body, res);
    if (!body) return;
    let session = null;
    if (req.astronaut) {
      const astronaut = await prisma.astronaut.findUnique({ where: { id: req.astronaut.id }, select: { id: true, name: true } });
      if (!astronaut) return sendError(res, 401, 'UNAUTHENTICATED', 'The astronaut in the token no longer exists.');
      session = { astronautId: astronaut.id, name: astronaut.name };
    }
    res.json(await runAssistant(body.message, session));
  } catch (e) {
    if (e instanceof AssistantUnavailableError) {
      console.warn('Assistant unavailable:', e.message);
      return sendError(res, 503, 'AI_UNAVAILABLE', 'The assistant is unavailable. The rest of the app keeps working.');
    }
    next(e);
  }
}
