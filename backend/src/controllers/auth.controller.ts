import { type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { type AuthRequest } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { jwtSecret, parseBody, idSchema, sendError } from './common.js';

export async function loginController(req: Request, res: Response, next: NextFunction) {
  try {
    const body = parseBody(z.object({ astronaut_id: idSchema, pin: z.string().regex(/^\d{4}$/) }), req.body, res);
    if (!body) return;
    const astronaut = await prisma.astronaut.findUnique({ where: { id: body.astronaut_id } });
    if (!astronaut) return sendError(res, 401, 'WRONG_PIN', 'The PIN is incorrect.');
    if (astronaut.lockedUntil && astronaut.lockedUntil > new Date()) {
      return sendError(res, 429, 'PIN_LOCKED', 'This profile is temporarily locked.', {
        retry_after_s: Math.ceil((astronaut.lockedUntil.getTime() - Date.now()) / 1000),
      });
    }
    const valid = astronaut.pinHash ? await bcrypt.compare(body.pin, astronaut.pinHash) : false;
    if (!valid) {
      const attempts = astronaut.failedPinAttempts + 1;
      const lockedUntil = attempts >= 3 ? new Date(Date.now() + 30000) : null;
      await prisma.astronaut.update({
        where: { id: astronaut.id },
        data: { failedPinAttempts: attempts >= 3 ? 0 : attempts, lockedUntil },
      });
      if (lockedUntil) return sendError(res, 429, 'PIN_LOCKED', 'This profile is temporarily locked.', { retry_after_s: 30 });
      return sendError(res, 401, 'WRONG_PIN', 'The PIN is incorrect.', { attempts_left: 3 - attempts });
    }
    await prisma.astronaut.update({ where: { id: astronaut.id }, data: { failedPinAttempts: 0, lockedUntil: null } });
    const expiresAt = new Date(Date.now() + 12 * 3600000);
    const token = jwt.sign({ astronaut_id: astronaut.id, role: astronaut.role }, jwtSecret, { expiresIn: '12h' });
    res.json({ token, astronaut: { id: astronaut.id, name: astronaut.name, role: astronaut.role, avatar: astronaut.avatar }, expires_at: expiresAt.toISOString() });
  } catch (e) {
    next(e);
  }
}
