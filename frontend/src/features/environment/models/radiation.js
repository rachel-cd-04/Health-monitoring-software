// Radiation context (F13, HM-13) built from the backend record: GET /api/radiation/events.
// The record is SIMULATED (source "simulated"): no dosimeter is connected. Dose is shown as mission
// context only; SOMA never turns it into a biological-risk verdict.
import { RULESET_VERSION } from '../../alerts/models/rules.js';

export const DOSE_UNIT = 'mSv';
export const RATE_UNIT = 'µSv/h';

export const EVENT_LABELS = {
  daily_total: 'Daily cabin dose',
  rate_sample: 'Dose-rate sample',
  solar_particle_event: 'Solar particle event',
  shelter_period: 'Storm-shelter period',
  eva: 'EVA',
  neutron_survey: 'Neutron survey',
};
export const LOCATION_LABELS = { cabin: 'Cabin', eva: 'EVA', shelter: 'Storm shelter' };
/** Events worth a place on the mission timeline (routine readings are not). */
export const TIMELINE_TYPES = ['solar_particle_event', 'shelter_period', 'eva'];

export const eventLabel = (type) => EVENT_LABELS[type] || String(type || 'Record').replace(/_/g, ' ');
export const locationLabel = (loc) => LOCATION_LABELS[loc] || loc || '—';
export const sourceLabel = (src) =>
  src === 'sensor' ? 'Sensor' : src === 'imported' ? 'Imported' : 'Simulated';

const DAY = 86400000;
const dayStart = (t) => Math.floor(t / DAY) * DAY;
const num = (v) => (v == null || v === '' ? null : Number(v));
const sum = (xs) => xs.reduce((s, x) => s + (x || 0), 0);
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b),
    m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** API rows → typed, time-sorted records. */
export function normalizeEvents(events = []) {
  return events
    .map((e) => ({
      id: String(e.id ?? `${e.ts}-${e.event_type}-${e.location}`),
      time: Date.parse(e.ts),
      doseMsv: num(e.dose_msv),
      rateUsvH: num(e.dose_rate_usv_h),
      radiationType: e.radiation_type || '—',
      location: e.location,
      instrument: e.instrument || '—',
      type: e.event_type,
      source: e.source || 'simulated',
    }))
    .filter((e) => Number.isFinite(e.time))
    .sort((a, b) => a.time - b.time);
}

/**
 * Everything the screen and the header need:
 * cumulative mission dose, last-7-days dose, current dose rate, daily series, timeline and records.
 */
export function summarizeRadiation(events = []) {
  const list = normalizeEvents(events);
  const daily = list
    .filter((e) => e.type === 'daily_total' && e.doseMsv != null)
    .map((e) => ({
      time: dayStart(e.time),
      dose: e.doseMsv,
      rate: e.rateUsvH,
      spe: /SPE|solar/i.test(e.radiationType),
    }));
  const rates = list.filter((e) => e.type === 'rate_sample' && e.rateUsvH != null);
  return {
    empty: list.length === 0,
    simulated: list.some((e) => e.source === 'simulated'),
    daily,
    missionMsv: sum(daily.map((d) => d.dose)),
    missionDays: daily.length,
    last7Msv: sum(daily.slice(-7).map((d) => d.dose)),
    currentRate: rates.at(-1) || null,
    rates,
    timeline: list.filter((e) => TIMELINE_TYPES.includes(e.type)).reverse(),
    records: list.filter((e) => e.type !== 'rate_sample').slice(-12).reverse(),
  };
}

/**
 * RAD-01 (illustrative): a daily cabin dose ≥ 2× the median of the 7 days before it, in the last
 * 3 days → "watch" environment signal. Same shape as the other environment signals (crewId null).
 */
export function radiationSignals(events = [], now = Date.now()) {
  const { daily } = summarizeRadiation(events);
  const out = [];
  for (const d of daily.filter((x) => x.time >= dayStart(now) - 3 * DAY)) {
    const prior = daily.filter((x) => x.time < d.time).slice(-7);
    if (prior.length < 4) continue;
    const base = median(prior.map((p) => p.dose));
    const ratio = base > 0 ? d.dose / base : 0;
    if (ratio < 2) continue;
    const day = new Date(d.time).toISOString().slice(0, 10);
    out.push({
      id: `RAD-01:${day}`,
      ruleId: 'RAD-01',
      ruleVersion: RULESET_VERSION,
      engine: 'frontend-demo',
      validated: false,
      crewId: null,
      metric: 'dose',
      level: 'watch',
      title: d.spe ? 'Elevated cabin dose · solar particle event' : 'Elevated cabin dose',
      threshold: 'Daily cabin dose ≥ 2× the median of the preceding 7 days.',
      reason: `${d.dose.toFixed(2)} ${DOSE_UNIT} on ${day} (${ratio.toFixed(1)}× the 7-day median of ${base.toFixed(2)} ${DOSE_UNIT}).`,
      observed: { value: d.dose, unit: DOSE_UNIT, time: d.time },
      baseline: null,
      delta: null,
      riskIds: ['radiation'],
      evaluatedAt: now,
    });
  }
  return out;
}
