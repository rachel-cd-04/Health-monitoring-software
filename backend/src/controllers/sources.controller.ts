import { type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { type AuthRequest } from '../middleware/auth.js';

export async function listSourcesController(_req: Request, res: Response, next: NextFunction) {
  try {
    const sources = await prisma.source.findMany({ orderBy: { id: 'asc' } });
    res.json(sources.map((source) => ({
      id: source.id,
      agency: source.agency,
      title: source.title,
      url: source.url,
      doc_type: source.docType,
      accessed_on: source.accessedOn,
    })));
  } catch (e) {
    next(e);
  }
}
