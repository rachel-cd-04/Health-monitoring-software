import { type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { type AuthRequest } from '../middleware/auth.js';
import { serialize } from './common.js';

export async function listRadiationEventsController(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(serialize(await prisma.radiationEvent.findMany({ orderBy: { ts: 'asc' } })));
  } catch (e) {
    next(e);
  }
}
