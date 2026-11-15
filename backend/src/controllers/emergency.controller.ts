import { type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { activeAlerts, createAlertFromRule, idSchema, indicators, missionDay, parseBody, scenarioSchema, sendError, serialize, uuidSchema } from './common.js';

export async function createEmergencyController(req: Request, res: Response, next: NextFunction) {
  try {
    const body = parseBody(z.object({ id: z.string().uuid().optional(), patient_id: idSchema.optional(), reporter_id: idSchema.optional(), scenario: scenarioSchema, started_at: z.coerce.date().optional() }), req.body, res);
    if (!body) return;
    const event = body.id
      ? await prisma.emergencyEvent.upsert({
          where: { id: body.id },
          update: {},
          create: { id: body.id, patientId: body.patient_id, reporterId: body.reporter_id, scenario: body.scenario, startedAt: body.started_at, source: 'manual' },
        })
      : await prisma.emergencyEvent.create({ data: { patientId: body.patient_id, reporterId: body.reporter_id, scenario: body.scenario, startedAt: body.started_at, source: 'manual' } });
    if (body.patient_id) {
      const alert = await createAlertFromRule(body.patient_id, 'X-01', 'emergency', null);
      if (alert) await prisma.alert.update({ where: { id: alert.id }, data: { value: null } });
    }
    res.status(201).json(serialize({ event }));
  } catch (e) {
    next(e);
  }
}

export async function getEmergencyContextController(req: Request, res: Response, next: NextFunction) {
  try {
    const id = uuidSchema.parse(req.params.id);
    const event = await prisma.emergencyEvent.findUniqueOrThrow({ where: { id }, include: { patient: true } });
    if (!event.patient) return res.json({ patient: null, mission_day: null, last_vitals: [], active_alerts: [] });
    const [vitals, alerts] = await Promise.all([prisma.measurement.findMany({ where: { astronautId: event.patient.id }, orderBy: { ts: 'desc' }, take: 10 }), activeAlerts(event.patient.id)]);
    res.json(serialize({
      patient: { id: event.patient.id, name: event.patient.name },
      mission_day: missionDay(event.patient.missionStart),
      last_vitals: vitals.map(({ indicator, value, unit, ts, source }) => ({ indicator, value, unit, ts, source })),
      active_alerts: alerts.map((item) => ({ level: item.level, title: item.message })),
    }));
  } catch (e) {
    next(e);
  }
}

export async function createEmergencyStepController(req: Request, res: Response, next: NextFunction) {
  try {
    const eventId = uuidSchema.parse(req.params.id);
    const body = parseBody(z.object({
      id: uuidSchema,
      step_id: z.string().trim().min(1).max(100),
      answer: z.string().max(2000).optional(),
      ts: z.coerce.date(),
      vital_indicator: z.enum(['heart_rate', 'bp_systolic', 'bp_diastolic', 'blood_sugar', 'temperature']).optional(),
      vital_value: z.number().optional(),
    }).refine((value) => (value.vital_indicator === undefined) === (value.vital_value === undefined), {
      message: 'vital_indicator and vital_value must be provided together.',
    }), req.body, res);
    if (!body) return;
    if (body.vital_indicator && body.vital_value !== undefined) {
      const range = indicators[body.vital_indicator];
      if (body.vital_value < range.min || body.vital_value > range.max) {
        return sendError(res, 400, 'VALUE_OUT_OF_RANGE', 'The emergency vital is outside the valid range.');
      }
    }
    const step = await prisma.emergencyStep.upsert({
      where: { id: body.id },
      update: {},
      create: {
        id: body.id,
        eventId,
        stepId: body.step_id,
        answer: body.answer,
        ts: body.ts,
        vitalIndicator: body.vital_indicator,
        vitalValue: body.vital_value,
      },
    });
    if (step.eventId !== eventId) {
      return sendError(res, 409, 'CONFLICT', 'This step ID already belongs to another emergency.');
    }
    res.status(201).json(serialize({ step }));
  } catch (e) {
    next(e);
  }
}

export async function closeEmergencyController(req: Request, res: Response, next: NextFunction) {
  try {
    const id = uuidSchema.parse(req.params.id);
    const body = parseBody(z.object({ ended_at: z.coerce.date().optional() }), req.body, res);
    if (!body) return;
    const event = await prisma.emergencyEvent.update({ where: { id }, data: { endedAt: body.ended_at ?? new Date() } });
    res.json(serialize({ event }));
  } catch (e) {
    next(e);
  }
}

export async function getEmergencySummaryController(req: Request, res: Response, next: NextFunction) {
  try {
    const id = uuidSchema.parse(req.params.id);
    const event = await prisma.emergencyEvent.findUniqueOrThrow({ where: { id }, include: { steps: { orderBy: { ts: 'asc' } } } });
    const text = `Emergency ${event.scenario} started at ${event.startedAt.toISOString()}. ${event.steps.length} step(s) recorded.`;
    res.json(serialize({ event, timeline: event.steps, vitals: event.steps.filter((step) => step.vitalIndicator), text }));
  } catch (e) {
    next(e);
  }
}

export { emergencyRateLimit } from './common.js';
