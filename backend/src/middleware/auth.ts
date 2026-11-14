import 'dotenv/config';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { sendError } from '../utils/http.js';

export type Auth = { id: number; role: 'crew' | 'commander' };
export type AuthRequest = Request & { astronaut?: Auth };

const jwtSecret = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required');
  return secret;
})();

function authFrom(req: Request): Auth | undefined {
  const value = req.header('authorization');
  if (!value?.startsWith('Bearer ')) return undefined;
  try {
    const payload = jwt.verify(value.slice(7), jwtSecret) as { astronaut_id?: number; role?: Auth['role'] };
    if (!payload.astronaut_id || !payload.role) return undefined;
    return { id: Number(payload.astronaut_id), role: payload.role };
  } catch {
    return undefined;
  }
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const astronaut = authFrom(req);
  if (!astronaut) return sendError(res, 401, 'UNAUTHENTICATED', 'A valid bearer token is required.');
  req.astronaut = astronaut;
  next();
}

/**
 * MOD-01: public endpoint that unlocks more data with a token (used by /assistant/chat).
 * No Authorization header → anonymous. A header with an invalid/expired token → 401, so a stale
 * session is never silently downgraded to anonymous without the client noticing.
 */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.header('authorization')) return next();
  const astronaut = authFrom(req);
  if (!astronaut) return sendError(res, 401, 'UNAUTHENTICATED', 'The bearer token is invalid or expired. Log in again or send no token.');
  req.astronaut = astronaut;
  next();
}

export function requireSelf(req: AuthRequest, res: Response, next: NextFunction) {
  const requested = Number(req.params.id ?? req.body?.astronaut_id);
  if (!req.astronaut || requested !== req.astronaut.id) {
    return sendError(res, 403, 'FORBIDDEN', 'The token does not belong to this astronaut.');
  }
  next();
}

export function requireCommander(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.astronaut?.role !== 'commander') {
    return sendError(res, 403, 'FORBIDDEN', 'Commander access is required.');
  }
  next();
}
