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
export const uuidSchema = z.string().uuid();
export const sourceSchema = z.enum(['manual', 'simulated', 'sensor']);
export const scenarioSchema = z.enum(['chest_pain', 'collapsed', 'breathing', 'bleeding', 'other']);
export const emergencyRateLimit = rateLimit({ windowMs: 60000, limit: 30 });

export const indicators: Record<string, { min: number; max: number; unit: string }> = {
  heart_rate: { min: 30, max: 220, unit: 'bpm' },
  bp_systolic: { min: 60, max: 260, unit: 'mmHg' },
  bp_diastolic: { min: 30, max: 160, unit: 'mmHg' },
  blood_sugar: { min: 20, max: 600, unit: 'mg/dL' },
  temperature: { min: 30, max: 43, unit: '°C' },
  exercise_min: { min: 0, max: 600, unit: 'min' },
  sleep_hours: { min: 0, max: 24, unit: 'h' },
  mood: { min: 1, max: 5, unit: '1–5' },
  fatigue: { min: 1, max: 5, unit: '1–5' },
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
  if (existing) return null;
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
    prisma.checkin.findMany({ where: { astronautId }, orderBy: { day: 'desc' }, take: 180 }),
    prisma.measurement.findMany({ where: { astronautId }, orderBy: { ts: 'desc' }, take: 1800 }),
  ]);
  type Point = { ts: Date; value: number; measurementId?: bigint };
  const pointsByDay = new Map<string, Map<string, Point>>();
  const addPoint = (indicator: string, ts: Date, value: number, measurementId?: bigint) => {
    const day = ts.toISOString().slice(0, 10);
    const byIndicator = pointsByDay.get(indicator) ?? new Map<string, Point>();
    if (!byIndicator.has(day)) byIndicator.set(day, { ts, value, measurementId });
    pointsByDay.set(indicator, byIndicator);
  };
  for (const measurement of measurements) {
    addPoint(measurement.indicator, measurement.ts, Number(measurement.value), measurement.id);
  }
  const checkinIndicators = {
    heart_rate: 'heartRate',
    bp_systolic: 'bpSystolic',
    bp_diastolic: 'bpDiastolic',
    blood_sugar: 'bloodSugar',
    temperature: 'temperature',
    sleep_hours: 'sleepHours',
    mood: 'mood',
    fatigue: 'fatigue',
    exercise_min: 'exerciseMin',
  } as const;
  for (const checkin of checkins) {
    for (const [indicator, field] of Object.entries(checkinIndicators)) {
      const value = checkin[field];
      if (value !== null) addPoint(indicator, checkin.day, Number(value));
    }
  }

  const consecutiveDays = (rows: Point[], count: number) => {
    if (rows.length < count) return false;
    const dayNumber = (date: Date) =>
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000;
    return rows.slice(0, count).every((point, index, selected) =>
      index === 0
        ? true
        : dayNumber(selected[index - 1].ts) - dayNumber(point.ts) === 1,
    );
  };
  const compare = (value: number, operator: string, threshold: number) => {
    if (operator === '<') return value < threshold;
    if (operator === '<=') return value <= threshold;
    if (operator === '>') return value > threshold;
    if (operator === '>=') return value >= threshold;
    return false;
  };
  const created = [];
  const configuredRules = await prisma.rule.findMany({ orderBy: [{ id: 'asc' }, { version: 'desc' }] });
  const latestRuleById = new Map<string, (typeof configuredRules)[number]>();
  for (const rule of configuredRules) {
    if (!latestRuleById.has(rule.id)) latestRuleById.set(rule.id, rule);
  }
  const rules = [...latestRuleById.values()];
  for (const rule of rules) {
    if (!rule.level || rule.level === 'green' || rule.id === 'X-01') continue;
    const rows = [...(pointsByDay.get(rule.indicator)?.values() ?? [])].sort(
      (left, right) => right.ts.getTime() - left.ts.getTime(),
    );
    const condition = rule.condition.trim();
    let triggeringPoint: Point | undefined;
    const consecutiveMatch = condition.match(
      /^value\s*(<=|>=|<|>)\s*(\d+(?:\.\d+)?)\s+for\s+(\d+)\s+consecutive days?$/i,
    );
    const baselineMatch = condition.match(
      /^value\s*(<=|>=|<|>)\s*baseline\s*\+\s*(\d+(?:\.\d+)?)\s+for\s+(\d+)\s+consecutive days?$/i,
    );
    if (consecutiveMatch && consecutiveDays(rows, Number(consecutiveMatch[3]))) {
      const [, operator, threshold, count] = consecutiveMatch;
      if (rows.slice(0, Number(count)).every((point) => compare(point.value, operator, Number(threshold)))) {
        triggeringPoint = rows[0];
      }
    } else if (baselineMatch && consecutiveDays(rows, Number(baselineMatch[3]))) {
      const [, operator, offset, count] = baselineMatch;
      const baselineRows = rows.slice(Number(count), Number(count) + 7);
      if (baselineRows.length) {
        const baseline = baselineRows.reduce((sum, point) => sum + point.value, 0) / baselineRows.length;
        if (
          rows
            .slice(0, Number(count))
            .every((point) => compare(point.value, operator, baseline + Number(offset)))
        ) {
          triggeringPoint = rows[0];
        }
      }
    } else if (rows.length) {
      const expressions = condition.split(/\s+or\s+/i);
      const matches = expressions.map((expression) =>
        expression.match(/^value\s*(<=|>=|<|>)\s*(\d+(?:\.\d+)?)$/i),
      );
      if (
        matches.some(
          (match) => match && compare(rows[0].value, match[1], Number(match[2])),
        )
      ) {
        triggeringPoint = rows[0];
      }
    }
    if (!triggeringPoint) continue;
    const alert = await createAlertFromRule(
      astronautId,
      rule.id,
      rule.indicator,
      triggeringPoint.value,
      triggeringPoint.measurementId,
    );
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


// The assistant (LLM adapter, tools, agentic loop) lives in src/llm/ (MOD-01).
