import { type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { type AuthRequest } from '../middleware/auth.js';
import { activeAlerts, alertResponse, createPointAlert, evaluateDerivedRules, idSchema, indicators, missionDay, parseBody, sendError, serialize, sourceSchema } from './common.js';

export async function listAstronautsController(_req: Request, res: Response, next: NextFunction) {
  try {
    const crew = await prisma.astronaut.findMany({ orderBy: { id: 'asc' } });
    res.json(crew.map((item) => ({ id: item.id, name: item.name, role: item.role, avatar: item.avatar, mission_day: missionDay(item.missionStart) })));
  } catch (e) {
    next(e);
  }
}

export async function createMeasurementController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = parseBody(z.object({
      astronaut_id: idSchema, indicator: z.string(), value: z.number(), unit: z.string(), ts: z.coerce.date().optional(),
      source: sourceSchema, mission_phase: z.enum(['pre', 'in_flight', 'post']).optional(),
    }), req.body, res);
    if (!body) return;
    const range = indicators[body.indicator];
    if (!range || body.value < range.min || body.value > range.max) return sendError(res, 400, 'VALUE_OUT_OF_RANGE', 'The measurement is outside the valid range.');
    const measurement = await prisma.measurement.create({
      data: { astronautId: body.astronaut_id, indicator: body.indicator, value: body.value, unit: body.unit, ts: body.ts, source: body.source, missionPhase: body.mission_phase },
    });
    const alerts = [
      ...(await createPointAlert(body.astronaut_id, measurement.id, body.indicator, body.value)),
      ...(await evaluateDerivedRules(body.astronaut_id)),
    ];
    res.status(201).json(serialize({ measurement, alerts: alerts.map(alertResponse) }));
  } catch (e) {
    next(e);
  }
}

export async function createCheckinController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = parseBody(z.object({
      astronaut_id: idSchema, day: z.coerce.date(), sleep_hours: z.number().min(0).max(24).optional(),
      mood: z.number().int().min(1).max(5).optional(), fatigue: z.number().int().min(1).max(5).optional(), source: z.enum(['manual', 'simulated']),
    }), req.body, res);
    if (!body) return;
    const checkin = await prisma.checkin.upsert({
      where: { astronautId_day: { astronautId: body.astronaut_id, day: body.day } },
      update: { sleepHours: body.sleep_hours, mood: body.mood, fatigue: body.fatigue, source: body.source },
      create: { astronautId: body.astronaut_id, day: body.day, sleepHours: body.sleep_hours, mood: body.mood, fatigue: body.fatigue, source: body.source },
    });
    const alerts = await evaluateDerivedRules(body.astronaut_id);
    res.status(201).json(serialize({ checkin, alerts: alerts.map(alertResponse) }));
  } catch (e) {
    next(e);
  }
}

export async function getStatusController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = idSchema.parse(req.params.id);
    const astronaut = await prisma.astronaut.findUniqueOrThrow({ where: { id } });
    const measurements = await prisma.measurement.findMany({ where: { astronautId: id }, orderBy: { ts: 'desc' }, take: 100 });
    const alerts = await activeAlerts(id);
    const systems = ['cardiovascular', 'metabolism_infection', 'sleep_mental', 'muscles_bones'].map((bodySystem) => {
      const systemAlerts = alerts.filter((item) => item.rule.bodySystem === bodySystem);
      const systemIndicators: Record<string, string[]> = {
        cardiovascular: ['heart_rate', 'bp_systolic', 'bp_diastolic'],
        metabolism_infection: ['blood_sugar', 'temperature'],
        sleep_mental: ['sleep_hours', 'mood', 'fatigue'],
        muscles_bones: ['exercise_min'],
      };
      const latest = measurements.filter((item) => systemIndicators[bodySystem].includes(item.indicator)).slice(0, 5);
      const status = systemAlerts.some((item) => item.level === 'red') ? 'red' : systemAlerts.length ? 'amber' : latest.length ? 'green' : 'grey';
      return { body_system: bodySystem, status, latest, alerts: systemAlerts.map(alertResponse) };
    });
    res.json(serialize({ astronaut: { id: astronaut.id, name: astronaut.name, role: astronaut.role, avatar: astronaut.avatar }, mission_day: missionDay(astronaut.missionStart), systems, active_alerts: alerts.map(alertResponse) }));
  } catch (e) {
    next(e);
  }
}

export async function getHistoryController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = idSchema.parse(req.params.id);
    const indicator = z.string().parse(req.query.indicator);
    const days = z.coerce.number().refine((value) => [7, 30, 180].includes(value)).parse(req.query.days ?? 7);
    const from = new Date(Date.now() - days * 86400000);
    const points = await prisma.measurement.findMany({ where: { astronautId: id, indicator, ts: { gte: from } }, orderBy: { ts: 'asc' } });
    const alertRows = await prisma.alert.findMany({ where: { astronautId: id, indicator, ts: { gte: from } }, orderBy: { ts: 'asc' } });
    const values = points.map((point) => Number(point.value));
    const mean = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    const spread = values.length > 1 ? Math.sqrt(values.reduce((sum, value) => sum + ((value - (mean ?? value)) ** 2), 0) / values.length) : 0;
    res.json(serialize({
      indicator,
      unit: points[0]?.unit ?? null,
      points: points.map((point) => ({ ts: point.ts, value: point.value, source: point.source })),
      baseline: { mean, low: mean === null ? null : mean - spread, high: mean === null ? null : mean + spread },
      alert_markers: alertRows.map((alert) => ({ ts: alert.ts, rule_id: alert.ruleId })),
      events: [],
    }));
  } catch (e) {
    next(e);
  }
}

export async function getRoutineController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const items = await prisma.routineItem.findMany({ where: { astronautId: idSchema.parse(req.params.id) }, orderBy: { dueAt: 'asc' } });
    res.json(serialize(items.map((item) => ({ id: item.id, item: item.item, due_at: item.dueAt, done: item.done, overdue: !item.done && item.dueAt < new Date() }))));
  } catch (e) {
    next(e);
  }
}

export async function updateRoutineController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = idSchema.parse(req.params.id);
    const itemId = BigInt(String(req.params.item_id));
    const body = parseBody(z.object({ done: z.boolean() }), req.body, res);
    if (!body) return;
    const item = await prisma.routineItem.updateMany({ where: { id: itemId, astronautId: id }, data: { done: body.done, completedAt: body.done ? new Date() : null } });
    if (!item.count) return sendError(res, 404, 'NOT_FOUND', 'Routine item not found.');
    const result = await prisma.routineItem.findUniqueOrThrow({ where: { id: itemId } });
    res.json(serialize({ id: result.id, item: result.item, due_at: result.dueAt, done: result.done, overdue: !result.done && result.dueAt < new Date() }));
  } catch (e) {
    next(e);
  }
}
