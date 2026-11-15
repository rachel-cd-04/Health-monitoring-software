import { type NextFunction, type Request, type Response } from 'express';
import { prisma } from '../db/client.js';
import { serialize } from './common.js';

export async function listRadiationEventsController(_req: Request, res: Response, next: NextFunction) {
  try {
    const events = await prisma.radiationEvent.findMany({ orderBy: { ts: 'asc' } });
    res.json(serialize(events.map((event) => ({
      id: event.id,
      ts: event.ts,
      dose_msv: event.doseMsv,
      dose_rate_usv_h: event.doseRateUsvH,
      radiation_type: event.radiationType,
      location: event.location,
      instrument: event.instrument,
      event_type: event.eventType,
      source: event.source,
    }))));
  } catch (e) {
    next(e);
  }
}
