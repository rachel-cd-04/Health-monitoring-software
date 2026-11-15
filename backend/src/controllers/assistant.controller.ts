import { type NextFunction, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { type AuthRequest } from '../middleware/auth.js';
import { AssistantUnavailableError, runAssistant } from '../llm/assistant.js';
import { parseBody, sendError } from './common.js';

// MOD-01 (api-contract.md > POST /assistant/chat): the body is `{ message }` only. `.strict()` rejects an
// `astronaut_id` with 400: whose private data may be used comes exclusively from the optional JWT.
// MOD-04: an optional `emergency` block carries what the emergency guide is showing right now, so the
// assistant can answer questions about the step in progress. It is the same non-private information the
// guide already displays without a PIN; it never unlocks stored data.
const short = (max: number) => z.string().trim().min(1).max(max);
export const emergencyContextSchema = z
  .object({
    situation: short(120),
    scenario: short(80).optional(),
    step: z
      .object({
        kind: z.enum(['question', 'action', 'vitals', 'summary']),
        title: short(200),
        items: z.array(short(300)).max(8).optional(),
      })
      .strict()
      .optional(),
    assessment: z
      .object({ responsive: short(40).optional(), breathing: short(40).optional(), onset: short(60).optional() })
      .strict()
      .optional(),
    vitals: z
      .array(z.object({ label: short(60), value: z.number().finite(), unit: short(20) }).strict())
      .max(12)
      .optional(),
    minutes_elapsed: z.number().int().min(0).max(100000).optional(),
    history: z
      .array(z.object({ role: z.enum(['user', 'assistant']), text: short(1500) }).strict())
      .max(6)
      .optional(),
  })
  .strict();
export type EmergencyContext = z.infer<typeof emergencyContextSchema>;

export const chatBodySchema = z
  .object({ message: z.string().trim().min(1).max(2000), emergency: emergencyContextSchema.optional() })
  .strict();

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
    res.json(await runAssistant(body.message, session, body.emergency));
  } catch (e) {
    if (e instanceof AssistantUnavailableError) {
      console.warn('Assistant unavailable:', e.message);
      return sendError(res, 503, 'AI_UNAVAILABLE', 'The assistant is unavailable. The rest of the app keeps working.');
    }
    next(e);
  }
}
