import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { type AuthRequest } from '../middleware/auth.js';
import { sendError } from '../utils/http.js';

export { sendError };

export const jwtSecret = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required');
  return secret;
})();

export const idSchema = z.coerce.number().int().positive();
export const sourceSchema = z.enum(['manual', 'simulated', 'sensor']);
export const scenarioSchema = z.enum(['chest_pain', 'collapsed', 'breathing', 'bleeding', 'other']);
export const emergencyRateLimit = rateLimit({ windowMs: 60000, limit: 30 });

export const indicators: Record<string, { min: number; max: number }> = {
  heart_rate: { min: 30, max: 220 },
  bp_systolic: { min: 60, max: 260 },
  bp_diastolic: { min: 30, max: 160 },
  blood_sugar: { min: 20, max: 600 },
  temperature: { min: 30, max: 43 },
  exercise_min: { min: 0, max: 600 },
  sleep_hours: { min: 0, max: 24 },
  mood: { min: 1, max: 5 },
  fatigue: { min: 1, max: 5 },
};

export function parseBody<T>(schema: z.ZodType<T>, body: unknown, res: Response): T | undefined {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    sendError(res, 400, 'VALIDATION_ERROR', 'The request body is invalid.', parsed.error.flatten());
    return undefined;
  }
  return parsed.data;
}

export function serialize(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === 'object') {
    if ('toNumber' in value && typeof value.toNumber === 'function') return value.toNumber();
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serialize(item)]));
  }
  return value;
}

export function missionDay(start: Date | null) {
  if (!start) return null;
  return Math.max(1, Math.floor((Date.now() - start.getTime()) / 86400000) + 1);
}

export async function activeAlerts(astronautId: number) {
  return prisma.alert.findMany({
    where: { astronautId, active: true },
    include: { rule: { include: { source: true } } },
    orderBy: { ts: 'desc' },
  });
}

export async function createAlertFromRule(
  astronautId: number,
  ruleId: string,
  indicator: string,
  value: number | null,
  measurementId?: bigint,
) {
  const rule = await prisma.rule.findFirst({ where: { id: ruleId }, orderBy: { version: 'desc' }, include: { source: true } });
  if (!rule || !rule.level || rule.level === 'green') return null;
  const existing = await prisma.alert.findFirst({ where: { astronautId, ruleId, active: true } });
  if (existing) return existing;
  return prisma.alert.create({
    data: {
      astronautId,
      ruleId: rule.id,
      ruleVersion: rule.version,
      indicator,
      value: value ?? undefined,
      measurementId,
      level: rule.level,
      message: rule.message,
    },
    include: { rule: { include: { source: true } } },
  });
}

export async function evaluateDerivedRules(astronautId: number) {
  const [checkins, measurements] = await Promise.all([
    prisma.checkin.findMany({ where: { astronautId }, orderBy: { day: 'desc' }, take: 10 }),
    prisma.measurement.findMany({ where: { astronautId }, orderBy: { ts: 'desc' }, take: 30 }),
  ]);
  const created = [];
  const sleepDays = checkins.filter((item) => item.sleepHours !== null).slice(0, 3);
  if (sleepDays.length === 3 && sleepDays.every((item) => Number(item.sleepHours) < 6)) {
    const alert = await createAlertFromRule(astronautId, 'S-01', 'sleep_hours', Number(sleepDays[0].sleepHours));
    if (alert) created.push(alert);
  }
  const lowMoodDays = checkins.filter((item) => item.mood !== null).slice(0, 3);
  if (lowMoodDays.length === 3 && lowMoodDays.every((item) => Number(item.mood) <= 2)) {
    const alert = await createAlertFromRule(astronautId, 'M-01', 'mood', Number(lowMoodDays[0].mood));
    if (alert) created.push(alert);
  }
  const heartRate = measurements.filter((item) => item.indicator === 'heart_rate').slice(0, 3);
  const baseline = heartRate.length ? heartRate.reduce((sum, item) => sum + Number(item.value), 0) / heartRate.length : null;
  if (heartRate.length === 3 && baseline !== null && Number(heartRate[0].value) > baseline + 15) {
    const alert = await createAlertFromRule(astronautId, 'C-01', 'heart_rate', Number(heartRate[0].value), heartRate[0].id);
    if (alert) created.push(alert);
  }
  const exerciseDays = measurements.filter((item) => item.indicator === 'exercise_min').slice(0, 5);
  if (exerciseDays.length === 5 && exerciseDays.every((item) => Number(item.value) < 60)) {
    const alert = await createAlertFromRule(astronautId, 'E-01', 'exercise_min', Number(exerciseDays[0].value), exerciseDays[0].id);
    if (alert) created.push(alert);
  }
  return created;
}

export function alertResponse(alert: any) {
  const source = alert.rule?.source;
  return {
    id: alert.id,
    astronaut_id: alert.astronautId,
    rule_id: alert.ruleId,
    rule_version: alert.ruleVersion,
    indicator: alert.indicator,
    value: alert.value,
    level: alert.level,
    message: alert.message,
    actions: alert.rule?.actions ?? [],
    who_acts: alert.rule?.whoActs ?? [],
    source: source ? { id: source.id, title: source.title, url: source.url } : null,
    ts: alert.ts,
    active: alert.active,
    illustrative: true,
  };
}

export async function syncRules() {
  const { default: yaml } = await import('yaml');
  const { readFile } = await import('node:fs/promises');
  const rules = yaml.parse(await readFile(new URL('../rules/rules.yaml', import.meta.url), 'utf8')) as Array<Record<string, unknown>>;
  for (const rule of rules) {
    const sourceId = typeof rule.source_id === 'string' && await prisma.source.findUnique({ where: { id: rule.source_id } })
      ? rule.source_id
      : null;
    await prisma.rule.upsert({
      where: { id_version: { id: String(rule.id), version: Number(rule.version) } },
      update: {
        indicator: String(rule.indicator),
        bodySystem: String(rule.body_system ?? ''),
        condition: String(rule.condition),
        level: String(rule.level) as 'amber' | 'red',
        whoActs: (rule.who_acts as string[]) ?? [],
        message: String(rule.message),
        actions: (rule.actions as string[]) ?? [],
        sourceId,
      },
      create: {
        id: String(rule.id),
        version: Number(rule.version),
        indicator: String(rule.indicator),
        bodySystem: String(rule.body_system ?? ''),
        condition: String(rule.condition),
        level: String(rule.level) as 'amber' | 'red',
        whoActs: (rule.who_acts as string[]) ?? [],
        message: String(rule.message),
        actions: (rule.actions as string[]) ?? [],
        sourceId,
      },
    });
  }
}

export async function createPointAlert(astronautId: number, measurementId: bigint, indicator: string, value: number) {
  const match =
    (indicator === 'bp_systolic' && (value >= 140 || value <= 90) && 'C-02') ||
    (indicator === 'blood_sugar' && (value < 70 || value > 180) && 'G-01') ||
    (indicator === 'temperature' && value >= 38 && 'T-01');
  if (!match) return [];
  const alert = await createAlertFromRule(astronautId, match, indicator, value, measurementId);
  return alert ? [alert] : [];
}

// The assistant (LLM adapter, tools, agentic loop) lives in src/llm/ (MOD-01).
