// Assistant tools (plan.md > Assistant agentic loop, MOD-01). All read-only, validated in the backend.
//
// Privacy model (spec.md > Access, privacy and roles > MOD-01):
//  - public tools: source registry + every astronaut's ACTIVE ALERTS (level + title). Nothing else.
//  - private tools: only the LOGGED-IN astronaut's own data. They take no astronaut_id argument:
//    the id comes from the verified JWT (`session`), so neither the user nor the model can choose
//    another astronaut. Private tools are not even offered to the model without a session.
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { activeAlerts, alertResponse, serialize } from '../controllers/common.js';

export type Session = { astronautId: number; name: string; role: 'crew' | 'commander' } | null;
export type SourceRef = { id: string; title: string; url: string };
export type ToolOutcome = { result: unknown; sources: SourceRef[] };

type ToolDefinition<Args> = {
  name: string;
  // public: anyone · private: the logged-in astronaut's own data · commander: any crew member (MOD-05)
  scope: 'public' | 'private' | 'commander';
  description: string;
  parameters: Record<string, unknown>;
  args: z.ZodType<Args>;
  run: (args: Args, astronautId: number | null) => Promise<ToolOutcome>;
};

/** A refusal that is sent back to the model (it can explain it) and never reaches private data. */
export class ToolAccessError extends Error {}

const CHECKIN_INDICATORS = ['sleep_hours', 'mood', 'fatigue'] as const;
const MEASUREMENT_INDICATORS = ['heart_rate', 'bp_systolic', 'bp_diastolic', 'blood_sugar', 'temperature', 'exercise_min'] as const;
const INDICATORS = [...MEASUREMENT_INDICATORS, ...CHECKIN_INDICATORS] as const;
type Indicator = (typeof INDICATORS)[number];
const UNITS: Record<Indicator, string> = {
  heart_rate: 'bpm', bp_systolic: 'mmHg', bp_diastolic: 'mmHg', blood_sugar: 'mg/dL', temperature: '°C',
  exercise_min: 'min', sleep_hours: 'h', mood: '1-5', fatigue: '1-5',
};

/** Trend numbers are computed here, not by the model (constitution #2: rules decide, AI explains). */
function stats(values: number[]) {
  if (!values.length) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return { count: values.length, min: Math.min(...values), max: Math.max(...values), mean: Math.round(mean * 10) / 10, first: values[0], last: values[values.length - 1] };
}

const getReferenceSources: ToolDefinition<{ source_ids?: string[] }> = {
  name: 'get_reference_sources',
  scope: 'public',
  description: 'Read the NASA/CSA source registry (id, agency, title, url). Pass source_ids to filter, or nothing to list every source.',
  parameters: { type: 'object', properties: { source_ids: { type: 'array', items: { type: 'string' } } } },
  args: z.object({ source_ids: z.array(z.string().max(80)).max(20).optional() }).strict(),
  async run({ source_ids }) {
    const sources = await prisma.source.findMany({
      where: source_ids?.length ? { id: { in: source_ids } } : undefined,
      orderBy: { id: 'asc' },
      select: { id: true, agency: true, title: true, url: true },
    });
    return { result: sources, sources: sources.map(({ id, title, url }) => ({ id, title, url })) };
  },
};

const getCrewActiveAlerts: ToolDefinition<Record<string, never>> = {
  name: 'get_crew_active_alerts',
  scope: 'public',
  description: "List every astronaut's active alerts (level and title only). This is the only public data about astronauts.",
  parameters: { type: 'object', properties: {} },
  args: z.object({}).strict(),
  async run() {
    const crew = await prisma.astronaut.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, name: true, alerts: { where: { active: true }, orderBy: { ts: 'desc' }, select: { level: true, message: true, ts: true } } },
    });
    // Explicit allow-list: the triggering value of an alert is private and is never selected.
    const result = crew.map((astronaut) => ({
      astronaut_id: astronaut.id,
      name: astronaut.name,
      active_alerts: astronaut.alerts.map((alert) => ({ level: alert.level, title: alert.message, ts: alert.ts.toISOString() })),
    }));
    return { result, sources: [] };
  },
};

/** Latest value per indicator, last 7 check-ins and active alerts of one astronaut. */
async function healthSummaryFor(id: number): Promise<ToolOutcome> {
  const [measurements, checkins, alerts] = await Promise.all([
    prisma.measurement.findMany({ where: { astronautId: id }, orderBy: { ts: 'desc' }, take: 200 }),
    prisma.checkin.findMany({ where: { astronautId: id }, orderBy: { day: 'desc' }, take: 7 }),
    activeAlerts(id),
  ]);
  const latest = new Map<string, (typeof measurements)[number]>();
  for (const measurement of measurements) if (!latest.has(measurement.indicator)) latest.set(measurement.indicator, measurement);
  const formatted = alerts.map(alertResponse);
  return {
    result: serialize({
      // The record `source` (manual/simulated/sensor) is not sent: astronauts enter their own data, and the
      // model must present it as their real readings, never as simulated.
      latest: [...latest.values()].map((m) => ({ indicator: m.indicator, value: Number(m.value), unit: m.unit, ts: m.ts })),
      recent_checkins: checkins.map((c) => ({ day: c.day, sleep_hours: c.sleepHours === null ? null : Number(c.sleepHours), mood: c.mood, fatigue: c.fatigue })),
      active_alerts: formatted.map((a) => ({ level: a.level, rule_id: a.rule_id, rule_version: a.rule_version, message: a.message, value: a.value, actions: a.actions, who_acts: a.who_acts, source_id: a.source?.id ?? null, ts: a.ts })),
      note: 'Alert thresholds are illustrative.',
    }),
    sources: formatted.flatMap((a) => (a.source ? [a.source as SourceRef] : [])),
  };
}

/** One indicator's history with backend-computed statistics. */
async function indicatorHistoryFor(id: number, indicator: Indicator, days: 7 | 30 | 180): Promise<ToolOutcome> {
  const since = new Date(Date.now() - days * 86400000);
  let points: Array<{ ts: Date; value: number; source: string }>;
  if ((CHECKIN_INDICATORS as readonly string[]).includes(indicator)) {
    const field = indicator === 'sleep_hours' ? 'sleepHours' : (indicator as 'mood' | 'fatigue');
    const checkins = await prisma.checkin.findMany({ where: { astronautId: id, day: { gte: since } }, orderBy: { day: 'asc' } });
    points = checkins.filter((c) => c[field] !== null).map((c) => ({ ts: c.day, value: Number(c[field]), source: c.source }));
  } else {
    const measurements = await prisma.measurement.findMany({ where: { astronautId: id, indicator, ts: { gte: since } }, orderBy: { ts: 'asc' } });
    points = measurements.map((m) => ({ ts: m.ts, value: Number(m.value), source: m.source }));
  }
  return {
    // Points go out without their record `source` (see get_my_health_summary).
    result: serialize({ indicator, unit: UNITS[indicator], days, stats: stats(points.map((p) => p.value)), points: points.slice(-60).map(({ ts, value }) => ({ ts, value })) }),
    sources: [],
  };
}

const getMyHealthSummary: ToolDefinition<Record<string, never>> = {
  name: 'get_my_health_summary',
  scope: 'private',
  description: "Read the logged-in astronaut's OWN latest value per indicator, last 7 check-ins and active alerts (with actions, rule and source).",
  parameters: { type: 'object', properties: {} },
  args: z.object({}).strict(),
  run: (_args, astronautId) => healthSummaryFor(astronautId!),
};

const getMyIndicatorHistory: ToolDefinition<{ indicator: Indicator; days: 7 | 30 | 180 }> = {
  name: 'get_my_indicator_history',
  scope: 'private',
  description: "Read the logged-in astronaut's OWN history for one indicator, with backend-computed statistics (count, min, max, mean, first, last).",
  parameters: {
    type: 'object',
    properties: { indicator: { type: 'string', enum: [...INDICATORS] }, days: { type: 'integer', enum: [7, 30, 180] } },
    required: ['indicator', 'days'],
  },
  args: z.object({ indicator: z.enum(INDICATORS), days: z.union([z.literal(7), z.literal(30), z.literal(180)]) }).strict(),
  run: ({ indicator, days }, astronautId) => indicatorHistoryFor(astronautId!, indicator, days),
};


// MOD-05: the commander may read any crew member's private data. These tools are only offered to, and
// only run for, a session whose role (read from the database, not the token) is `commander`.
const crewMemberId = z.number().int().positive();
async function requireCrewMember(id: number) {
  const astronaut = await prisma.astronaut.findUnique({ where: { id }, select: { id: true } });
  if (!astronaut) throw new ToolAccessError(`There is no crew member with astronaut_id ${id}. Use get_crew_active_alerts to list the crew.`);
}

const getCrewMemberHealthSummary: ToolDefinition<{ astronaut_id: number }> = {
  name: 'get_crew_member_health_summary',
  scope: 'commander',
  description: "Commander only. Read ANY crew member's latest value per indicator, last 7 check-ins and active alerts. Get astronaut ids from get_crew_active_alerts or the crew list in your instructions.",
  parameters: { type: 'object', properties: { astronaut_id: { type: 'integer' } }, required: ['astronaut_id'] },
  args: z.object({ astronaut_id: crewMemberId }).strict(),
  async run({ astronaut_id }) {
    await requireCrewMember(astronaut_id);
    return healthSummaryFor(astronaut_id);
  },
};

const getCrewMemberIndicatorHistory: ToolDefinition<{ astronaut_id: number; indicator: Indicator; days: 7 | 30 | 180 }> = {
  name: 'get_crew_member_indicator_history',
  scope: 'commander',
  description: "Commander only. Read ANY crew member's history for one indicator, with backend-computed statistics (count, min, max, mean, first, last).",
  parameters: {
    type: 'object',
    properties: { astronaut_id: { type: 'integer' }, indicator: { type: 'string', enum: [...INDICATORS] }, days: { type: 'integer', enum: [7, 30, 180] } },
    required: ['astronaut_id', 'indicator', 'days'],
  },
  args: z.object({ astronaut_id: crewMemberId, indicator: z.enum(INDICATORS), days: z.union([z.literal(7), z.literal(30), z.literal(180)]) }).strict(),
  async run({ astronaut_id, indicator, days }) {
    await requireCrewMember(astronaut_id);
    return indicatorHistoryFor(astronaut_id, indicator, days);
  },
};

const ALL_TOOLS = [getReferenceSources, getCrewActiveAlerts, getMyHealthSummary, getMyIndicatorHistory, getCrewMemberHealthSummary, getCrewMemberIndicatorHistory] as ToolDefinition<any>[];

/** Tool definitions offered to the model for this session (private tools only when logged in). */
export function toolsForSession(session: Session) {
  return ALL_TOOLS
    .filter((tool) => tool.scope === 'public' || (tool.scope === 'private' && session !== null) || (tool.scope === 'commander' && session?.role === 'commander'))
    .map((tool) => ({ type: 'function' as const, function: { name: tool.name, description: tool.description, parameters: tool.parameters } }));
}

/**
 * Runs a tool requested by the model. Defense in depth: even if the model calls a tool it was not
 * offered, private tools refuse without a session, and arguments are validated strictly
 * (an injected `astronaut_id` argument is rejected, not silently ignored).
 */
export async function executeTool(name: string, rawArgs: unknown, session: Session): Promise<ToolOutcome> {
  const tool = ALL_TOOLS.find((candidate) => candidate.name === name);
  if (!tool) throw new ToolAccessError(`Unknown tool: ${name}`);
  if (tool.scope === 'private' && !session) throw new ToolAccessError('Private data requires the astronaut to log in to their own profile with their PIN.');
  if (tool.scope === 'commander' && session?.role !== 'commander') throw new ToolAccessError('Only the commander can read other crew members\' private data.');
  const parsed = tool.args.safeParse(rawArgs ?? {});
  if (!parsed.success) throw new ToolAccessError(`Invalid arguments for ${name}: ${parsed.error.issues.map((issue) => issue.message).join('; ')}`);
  return tool.run(parsed.data, tool.scope === 'public' ? null : session!.astronautId);
}
