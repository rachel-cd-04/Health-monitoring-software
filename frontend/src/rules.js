// Deterministic, versioned rule engine (client-side for the no-backend demo).
// Thresholds are ILLUSTRATIVE. Rules decide; nothing else computes risk.
import { MISSION_DAY, CREW } from './sim';
import { INDICATORS, SYSTEM_ORDER, SYSTEMS } from './content/indicators';

const upTo = (s, day) => s.filter(p => p.day <= day);

// Last n daily points, on consecutive days, recent, all matching pred -> latest point or null
function streak(s, day, n, pred) {
  const a = upTo(s, day).slice(-n);
  if (a.length < n || a[n - 1].day < day - 1) return null;
  for (let i = 0; i < n; i++) if (a[i].day !== a[0].day + i) return null;
  return a.every(p => pred(p.value)) ? a[n - 1] : null;
}
// Latest recent point matching pred
function latestHit(s, day, pred) {
  const a = upTo(s, day);
  const p = a[a.length - 1];
  return p && p.day >= day - 1 && pred(p.value) ? p : null;
}

export const RULES = [
  { id: 'S-01', version: 1, indicator: 'sleep_hours', system: 'mental', level: 'amber', who: ['self'], source: 'nasa-risks-sleep',
    title: 'Short sleep for three nights',
    message: 'You have slept less than 6 hours for three nights in a row. Sleep loss affects alertness and mood.',
    actions: ['Check cabin lighting and your sleep schedule.', 'Avoid caffeine and screens before your rest period.', 'If it continues, report it at the next ground contact.'],
    test: (s, day) => streak(s, day, 3, v => v < 6) },
  { id: 'M-01', version: 1, indicator: 'mood', system: 'mental', level: 'amber', who: ['self', 'crew'], source: 'nasa-risks-behavioral',
    title: 'Low mood for three days',
    message: 'Your mood has been low for three days in a row.',
    actions: ['Talk to a crewmate or schedule a call with family.', 'Review your workload and rest periods.'],
    test: (s, day) => streak(s, day, 3, v => v <= 2) },
  { id: 'C-01', version: 1, indicator: 'heart_rate', system: 'cardio', level: 'amber', who: ['self'], source: 'nasa-risks-cardio',
    title: 'Heart rate above your usual',
    message: 'Your heart rate has been more than 15 bpm above your own average for three days.',
    actions: ['Measure again at rest, seated, after 5 minutes.', 'Check hydration, caffeine and sleep.', 'If it persists, report it at the next ground contact.'],
    test: (s, day, b) => b && streak(s, day, 3, v => v > b.mean + 15) },
  { id: 'C-02', version: 1, indicator: 'bp_systolic', system: 'cardio', level: 'red', who: ['crew', 'ground'], source: 'nasa-risks-cardio',
    title: 'Blood pressure out of range',
    message: 'Your systolic blood pressure is out of the illustrative range (140 or above, or 90 or below).',
    actions: ['Rest for 5 minutes and measure again before acting on this value.', 'Tell a crewmate.', 'If it is still out of range, contact the flight surgeon.'],
    test: (s, day) => latestHit(s, day, v => v >= 140 || v <= 90) },
  { id: 'G-01', version: 1, indicator: 'blood_sugar', system: 'metabolic', level: 'red', who: ['self', 'crew'], source: 'nasa-risks-nutrition',
    title: 'Blood sugar out of range',
    message: 'Your blood sugar is out of the illustrative range (below 70 or above 180 mg/dL).',
    actions: ['Repeat the measurement to confirm.', 'Check when you last ate and follow your on-board nutrition plan.', 'Tell a crewmate.'],
    test: (s, day) => latestHit(s, day, v => v < 70 || v > 180) },
  { id: 'T-01', version: 1, indicator: 'temperature', system: 'metabolic', level: 'amber', who: ['self', 'crew'], source: 'nasa-risks-immune',
    title: 'Body temperature elevated',
    message: 'Your body temperature is 38.0 °C or higher.',
    actions: ['Rest, drink water and measure again in 30 minutes.', 'Tell a crewmate if it stays high or you feel unwell.'],
    test: (s, day) => latestHit(s, day, v => v >= 38.0) },
  { id: 'E-01', version: 1, indicator: 'exercise_min', system: 'musculo', level: 'amber', who: ['self'], source: 'nasa-risks-fitness',
    title: 'Exercise below target for five days',
    message: 'You have exercised less than 60 minutes a day for five days. Exercise is the main countermeasure for muscle and bone loss.',
    actions: ['Schedule your exercise session in today\'s routine.', 'Short sessions still help.'],
    test: (s, day) => streak(s, day, 5, v => v < 60) },
];

export function buildSeries(records) {
  const bucket = {};
  for (const r of records) (((bucket[r.astroId] ||= {})[r.indicator] ||= new Map())).set(r.day, r); // later record of the day wins
  const out = {};
  for (const [a, inds] of Object.entries(bucket)) {
    out[a] = {};
    for (const [ind, m] of Object.entries(inds)) {
      out[a][ind] = [...m.values()].sort((x, y) => x.day - y.day || x.ts - y.ts)
        .map(r => ({ day: r.day, value: r.value, ts: r.ts, source: r.source, id: r.id }));
    }
  }
  return out;
}

export function baselineOf(s) {
  if (!s || !s.length) return null;
  let a = s.filter(p => p.day <= 60);
  if (a.length < 8) a = s;
  const mean = a.reduce((t, p) => t + p.value, 0) / a.length;
  const sd = Math.sqrt(a.reduce((t, p) => t + (p.value - mean) ** 2, 0) / a.length);
  return { mean, sd };
}

const rank = { red: 3, amber: 2, green: 1, grey: 0 };
export const worst = list => list.reduce((w, x) => (rank[x] > rank[w] ? x : w), 'grey');

// emergencyLogs: [{ patientId, startedAt }]
export function buildEngine(records, emergencyLogs = [], day = MISSION_DAY) {
  const series = buildSeries(records);
  const baselines = {}, alerts = {}, status = {};
  for (const p of CREW) {
    const s = series[p.id] || {};
    baselines[p.id] = {};
    for (const ind of Object.keys(INDICATORS)) baselines[p.id][ind] = baselineOf(s[ind]);
    const list = [];
    for (const rule of RULES) {
      const hit = rule.test(s[rule.indicator] || [], day, baselines[p.id][rule.indicator]);
      if (hit) list.push({
        key: rule.id + ':' + p.id, ruleId: rule.id, version: rule.version, astroId: p.id, indicator: rule.indicator,
        value: hit.value, level: rule.level, title: rule.title, message: rule.message, actions: rule.actions,
        who: rule.who, source: rule.source, system: rule.system, day: hit.day,
      });
    }
    if (emergencyLogs.some(e => e.patientId === p.id && Date.now() - e.startedAt < 12 * 3600000)) list.push({
      key: 'X-01:' + p.id, ruleId: 'X-01', version: 1, astroId: p.id, indicator: 'emergency', value: null, level: 'red',
      title: 'Emergency triggered', message: 'An emergency was started for this crew member.',
      actions: ['Follow your mission medical procedures.', 'Follow the on-screen guide step by step.'],
      who: ['crew', 'ground'], source: 'mission-medical-procedure', system: null, day,
    });
    list.sort((a, b) => rank[b.level] - rank[a.level]);
    alerts[p.id] = list;
    const systems = {};
    for (const sys of SYSTEM_ORDER) {
      const recent = SYSTEMS[sys].indicators.some(i => (s[i] || []).some(pt => pt.day >= day - 3));
      const lv = list.filter(a => a.system === sys).map(a => a.level);
      systems[sys] = lv.length ? worst(lv) : recent ? 'green' : 'grey';
    }
    status[p.id] = { systems, overall: list.some(a => a.ruleId === 'X-01') ? 'red' : worst(Object.values(systems)) };
  }
  return { series, baselines, alerts, status, day };
}
