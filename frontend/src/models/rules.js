// SOMA signal engine — FRONTEND DEMONSTRATION ADAPTER.
// Deterministic, explainable rules taken from spec.md (S-01, M-01, C-01, C-02, G-01, T-01, E-01).
// The thresholds are illustrative and NOT clinically validated. A backend rules service can replace
// `evaluateSignals` as long as it returns the same Signal shape (see README → "Signals contract").
import {crew, metrics, number, stamp} from './crewModel.js';
import {metricRisk} from './risks.js';

export const RULESET_VERSION = 'spec-1.0';
export const SIGNAL_ENGINE = 'frontend-demo';
export const BASELINE_DAYS = 7;
export const MIN_BASELINE = 4;
const DAY = 86400000;

// Rules from spec.md (illustrative thresholds, not clinically validated).
// kind 'streak': every one of the last `days` daily samples meets `test`.
// kind 'baseline': every one of the last `days` samples is ≥ `delta` above the personal baseline before them.
// kind 'latest': the latest sample meets `test`.
// severity: 'amber' → level 'watch'; 'red' → level 'review'.
export const rules = [
  {id:'S-01', metric:'sleep', kind:'streak', days:3, test:v => v < 6, severity:'amber', whoActs:'Self', short:'Short sleep 3 nights', title:'Sleep under 6 h for 3 consecutive nights', threshold:'Sleep < 6 h for 3 consecutive nights.'},
  {id:'M-01', metric:'mood', kind:'streak', days:3, test:v => v <= 2, severity:'amber', whoActs:'Self + crew', short:'Low mood 3 days', title:'Mood 2/5 or lower for 3 days', threshold:'Mood ≤ 2 for 3 consecutive days.'},
  {id:'C-01', metric:'pulse', kind:'baseline', days:3, delta:15, severity:'amber', whoActs:'Self', short:'Resting heart rate above usual', title:'Resting heart rate above personal baseline for 3 days', threshold:'Resting HR > personal baseline + 15 bpm for 3 consecutive days.'},
  {id:'C-02', metric:'bp', kind:'latest', test:v => v >= 140 || v <= 90, severity:'red', whoActs:'Crew + ground', short:'Blood pressure out of range', title:'Systolic pressure out of range', threshold:'Systolic ≥ 140 or ≤ 90 mmHg.'},
  {id:'G-01', metric:'glucose', kind:'latest', test:v => v < 70 || v > 180, severity:'red', whoActs:'Self + crew', short:'Blood sugar out of range', title:'Blood sugar out of range', threshold:'Blood sugar < 70 or > 180 mg/dL.'},
  {id:'T-01', metric:'temp', kind:'latest', test:v => v >= 38, severity:'amber', whoActs:'Self + crew', short:'Raised temperature', title:'Body temperature 38.0 °C or higher', threshold:'Temperature ≥ 38.0 °C.'},
  {id:'E-01', metric:'exercise', kind:'streak', days:5, test:v => v < 60, severity:'amber', whoActs:'Self', short:'Low exercise 5 days', title:'Exercise under 60 min/day for 5 days', threshold:'Exercise < 60 min/day for 5 consecutive days.'},
];
export const DATA_RULE = {id:'DATA-01', title:'No recent check-in data', threshold:'No completed check-in in the last 24 h.'};

const samplesFor = (records, crewId, metric) => records.filter(r => r.crewId === crewId && r.metric === metric && Number.isFinite(Number(r.value))).sort((a, b) => a.time - b.time);
const u = (v, unit) => unit.startsWith('/') ? `${number(v)}${unit}` : `${number(v)} ${unit}`;
const mean = xs => xs.reduce((s, x) => s + x, 0) / xs.length;
const sd = xs => { const m = mean(xs); return Math.sqrt(mean(xs.map(x => (x - m) ** 2))); };

/** Personal baseline from the BASELINE_DAYS before `before` (exclusive). */
export function baseline(records, crewId, metric, before = Date.now(), exclude = []) {
  const ids = new Set(exclude);
  const xs = samplesFor(records, crewId, metric).filter(r => r.time < before && r.time >= before - BASELINE_DAYS * DAY && !ids.has(r.id));
  if (xs.length < MIN_BASELINE) return {status:'building', n:xs.length, days:BASELINE_DAYS};
  const values = xs.map(r => Number(r.value));
  return {status:'ready', mean:mean(values), sd:sd(values), n:xs.length, days:BASELINE_DAYS, from:xs[0].time, to:xs.at(-1).time};
}

function evaluateRule(rule, records, crewId, now) {
  const xs = samplesFor(records, crewId, rule.metric).filter(r => r.time <= now);
  const n = rule.kind === 'latest' ? 1 : rule.days;
  if (xs.length < n) return null;
  const recent = xs.slice(-n), values = recent.map(r => Number(r.value)), last = recent.at(-1), m = metrics[rule.metric];
  let base = null, fired;
  if (rule.kind === 'baseline') {
    base = baseline(records, crewId, rule.metric, recent[0].time);
    if (base.status !== 'ready') return null;
    fired = values.every(v => v - base.mean > rule.delta);
  } else {
    fired = values.every(rule.test);
    const b = baseline(records, crewId, rule.metric, recent[0].time);
    if (b.status === 'ready') base = b;
  }
  if (!fired) return null;
  const observed = rule.kind === 'latest' ? values[0] : mean(values);
  const list = values.map(v => number(v)).join(', '), suffix = m.unit.startsWith('/') ? m.unit : ' ' + m.unit;
  const observedLabel = rule.kind === 'latest' ? `Latest: ${u(observed, m.unit)}` : `Last ${n} daily check-ins: ${list}${suffix}`;
  const compare = rule.kind === 'latest' ? `${u(observed, m.unit)}${base ? ` · usual ${u(base.mean, m.unit)}` : ''}` : rule.kind === 'baseline' ? `${list} vs usual ${u(base.mean, m.unit)}` : `${list}${suffix}`;
  return {
    id:`${rule.id}:${crewId}:${last.id}`, ruleId:rule.id, ruleVersion:RULESET_VERSION, engine:SIGNAL_ENGINE, validated:false,
    crewId, metric:rule.metric, short:rule.short, compare, severity:rule.severity, level:rule.severity === 'red' ? 'review' : 'watch', whoActs:rule.whoActs,
    title:rule.title, threshold:rule.threshold,
    observed:{value:observed, unit:m.unit, time:last.time, recordIds:recent.map(r => r.id)},
    baseline:base ? {mean:base.mean, sd:base.sd, n:base.n, days:base.days, from:base.from, to:base.to} : null,
    delta:base ? observed - base.mean : null,
    reason:`${observedLabel}${base ? ` · personal baseline ${u(base.mean, m.unit)} (${base.n} samples, ${base.days} days)` : ''}. Who acts: ${rule.whoActs}.`,
    riskIds:metricRisk[rule.metric] ? [metricRisk[rule.metric]] : [], evaluatedAt:now,
  };
}

/**
 * Signal contract: {id, ruleId, ruleVersion, engine, validated, crewId, metric|null, severity:'amber'|'red'|null, level:'watch'|'review'|'info', whoActs,
 * title, threshold, reason, observed, baseline, delta, riskIds[], evaluatedAt}
 */
export function evaluateSignals(data, crewId, now = Date.now()) {
  const out = rules.map(rule => evaluateRule(rule, data.records, crewId, now)).filter(Boolean);
  const lastSession = data.sessions.filter(s => s.crewId === crewId && s.time <= now).sort((a, b) => b.time - a.time)[0];
  if (!lastSession || now - lastSession.time > DAY) {
    out.push({id:`${DATA_RULE.id}:${crewId}`, ruleId:DATA_RULE.id, ruleVersion:RULESET_VERSION, engine:SIGNAL_ENGINE, validated:false, crewId, metric:null, short:'No recent check-in', compare:lastSession?`Last: ${stamp(lastSession.time)}`:'No check-in on record', level:'info',
      title:DATA_RULE.title, threshold:DATA_RULE.threshold,
      reason:lastSession ? `Last completed check-in: ${stamp(lastSession.time)}. Missing data is not a confirmation of good health.` : 'No completed check-in on record. Missing data is not a confirmation of good health.',
      observed:null, baseline:null, delta:null, severity:null, whoActs:'Self', riskIds:[], evaluatedAt:now});
  }
  const order = {review:0, watch:1, info:2};
  return out.sort((a, b) => order[a.level] - order[b.level]);
}

export const crewSignals = (data, now = Date.now()) => Object.fromEntries(crew.map(p => [p.id, evaluateSignals(data, p.id, now)]));
export const levelLabel = {review:'Red · act now', watch:'Amber · keep an eye on it', info:'Information'};
