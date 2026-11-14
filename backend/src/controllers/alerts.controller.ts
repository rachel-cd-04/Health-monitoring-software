import { type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { type AuthRequest } from '../middleware/auth.js';
import { alertResponse, sendError, serialize } from './common.js';

export async function acknowledgeAlertController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = BigInt(String(req.params.id));
    const result = await prisma.alert.updateMany({ where: { id, astronautId: req.astronaut!.id, active: true }, data: { active: false, acknowledgedAt: new Date() } });
    if (!result.count) return sendError(res, 404, 'NOT_FOUND', 'Alert not found.');
    const alert = await prisma.alert.findUnique({ where: { id }, include: { rule: { include: { source: true } } } });
    res.json(serialize({ alert: alert ? alertResponse(alert) : null }));
  } catch (e) {
    next(e);
  }
}
