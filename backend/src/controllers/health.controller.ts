import { type Request, type Response } from 'express';
import { prisma } from '../db/client.js';

export async function healthController(_req: Request, res: Response) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'up', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'down', timestamp: new Date().toISOString() });
  }
}
