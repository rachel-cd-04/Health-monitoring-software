import { type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { type AuthRequest } from '../middleware/auth.js';
import { activeAlerts, alertResponse, missionDay, serialize } from './common.js';

type OverallStatus = 'red' | 'amber' | 'grey' | 'green';

export async function getCrewOverviewController(_req: Request, res: Response, next: NextFunction) {
  try {
    const crew = await prisma.astronaut.findMany({ orderBy: { id: 'asc' } });
    const result = await Promise.all(crew.map(async (item) => {
      const alerts = await activeAlerts(item.id);
      const overall: OverallStatus = alerts.some((a) => a.level === 'red') ? 'red' : alerts.length ? 'amber' : 'green';
      return { id: item.id, name: item.name, role: item.role, avatar: item.avatar, overall, active_alert_count: alerts.length };
    }));
    const attentionOrder = { red: 0, amber: 1, grey: 2, green: 3 };
    result.sort((left, right) => attentionOrder[left.overall] - attentionOrder[right.overall]);
    res.json({ mission_day: missionDay(crew[0]?.missionStart ?? null), environment: 'space_station', comms_delay_s: 1, crew: result });
  } catch (e) {
    next(e);
  }
}

export async function getCrewAlertsController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const alerts = await prisma.alert.findMany({ where: { active: true, astronautId: { not: req.astronaut!.id } }, include: { astronaut: true }, orderBy: { ts: 'desc' } });
    res.json(serialize(alerts.map((item) => ({ astronaut_id: item.astronautId, name: item.astronaut.name, level: item.level, title: item.message, ts: item.ts }))));
  } catch (e) {
    next(e);
  }
}
