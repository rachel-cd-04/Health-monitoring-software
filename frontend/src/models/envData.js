// Mission environment — SYNTHETIC demonstration data.
// No dosimeter or cabin sensor is connected. Values are deterministic per UTC day so the demo is
// reproducible. Magnitudes are illustrative and were chosen only to make the interface legible.
// Exposure is environmental context: SOMA never converts dose into a biological-risk verdict.
import {RULESET_VERSION} from './rules.js';

const DAY = 86400000;
export const DATA_STATUS = 'Synthetic';
export const DOSE_UNIT = 'µGy/day';

export const locations = [
  {id:'lab', name:'Laboratory module', instrument:'Area dosimeter A-1 (simulated, MOSFET-type)', base:245, event:2.4},
  {id:'quarters', name:'Crew quarters', instrument:'Area dosimeter A-2 (simulated, MOSFET-type)', base:205, event:1.9},
  {id:'galley', name:'Galley and node', instrument:'Area dosimeter A-3 (simulated, MOSFET-type)', base:255, event:2.6},
  {id:'cupola', name:'Observation cupola', instrument:'Area dosimeter A-4 (simulated, MOSFET-type)', base:300, event:3.4},
  {id:'shelter', name:'Storm shelter', instrument:'Bubble-detector set N-1 (simulated)', base:160, event:1.3},
];

const noise = (seed) => { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); };
const dayKey = t => new Date(t).toISOString().slice(0, 10);
const dayStart = t => Date.parse(dayKey(t) + 'T00:00:00Z');

/** Daily absorbed dose per location for the last `days` UTC days (oldest first). */
export function doseHistory(now = Date.now(), days = 10) {
  const today = dayStart(now), eventDay = today - 2 * DAY;
  return Array.from({length:days}, (_, i) => {
    const t = today - (days - 1 - i) * DAY, row = {time:t, day:dayKey(t), event:t === eventDay};
    for (const loc of locations) {
      const n = noise(t / DAY + loc.base);
      const v = loc.base * (0.94 + n * 0.12) * (t === eventDay ? loc.event : 1);
      row[loc.id] = Math.round(v);
    }
    return row;
  });
}

const median = xs => { const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** Personal dose: time-weighted share of locations plus EVA exposure (badge dosimeter, simulated). */
export const evaLog = [{crewId:'leo', daysAgo:4, hours:6.5, dose:180, note:'EVA badge dosimeter (simulated, EVARM-style)'}];
const occupancy = {ana:{lab:.45, quarters:.4, galley:.15}, leo:{lab:.3, quarters:.4, galley:.15, cupola:.15}, ines:{lab:.5, quarters:.4, galley:.1}, noa:{lab:.45, quarters:.4, galley:.15}};

export function personalDose(crewId, now = Date.now(), days = 7) {
  const rows = doseHistory(now, days), share = occupancy[crewId] || occupancy.ana;
  const cabin = rows.reduce((sum, r) => sum + Object.entries(share).reduce((s, [loc, w]) => s + r[loc] * w, 0), 0);
  const eva = evaLog.filter(e => e.crewId === crewId && e.daysAgo < days).reduce((s, e) => s + e.dose, 0);
  return {cabin:Math.round(cabin), eva, total:Math.round(cabin + eva), days};
}

/** Cabin atmosphere over the last 24 h, 30-minute samples (simulated). */
export function cabinSeries(now = Date.now()) {
  const end = Math.floor(now / 1800000) * 1800000;
  return Array.from({length:48}, (_, i) => {
    const t = end - (47 - i) * 1800000, h = new Date(t).getUTCHours() + new Date(t).getUTCMinutes() / 60, n = noise(t / 1800000);
    const exercise = h >= 14 && h < 15.5; // crew exercise block raises local ppCO2 in this scenario
    return {time:t, temp:+(22.3 + Math.sin(h / 24 * Math.PI * 2) * .35 + n * .2).toFixed(1), pressure:+(101.2 + n * .2).toFixed(1),
      co2:+(2.7 + n * .4 + (exercise ? 1.4 : 0)).toFixed(1), humidity:Math.round(44 + n * 6)};
  });
}

export const cabinReference = {temp:{label:'Cabin temperature', unit:'°C'}, pressure:{label:'Total pressure', unit:'kPa'}, co2:{label:'ppCO₂', unit:'mmHg', demoLimit:4.0}, humidity:{label:'Relative humidity', unit:'%'}};

/** Environment signals use the same contract as physiological signals (crewId:null). */
export function environmentSignals(now = Date.now()) {
  const out = [], rows = doseHistory(now, 10);
  const recent = rows.slice(-3);
  for (const r of recent) {
    const prior = rows.filter(x => x.time < r.time).slice(-7);
    if (prior.length < 4) continue;
    const elevated = locations.map(l => ({l, ratio:r[l.id] / median(prior.map(p => p[l.id]))})).filter(x => x.ratio >= 2);
    if (elevated.length) {
      const top = elevated.sort((a, b) => b.ratio - a.ratio)[0];
      out.push({id:`RAD-01:${r.day}`, ruleId:'RAD-01', ruleVersion:RULESET_VERSION, engine:'frontend-demo', validated:false, crewId:null, metric:'dose', level:'watch',
        title:'Elevated area dose (simulated event)', threshold:'Daily area dose ≥ 2× the median of the preceding 7 days.',
        reason:`${elevated.length} of ${locations.length} locations above threshold on ${r.day}. Highest: ${top.l.name}, ${r[top.l.id]} ${DOSE_UNIT} (${top.ratio.toFixed(1)}× median).`,
        observed:{value:r[top.l.id], unit:DOSE_UNIT, time:r.time}, baseline:null, delta:null, riskIds:['radiation'], evaluatedAt:now});
    }
  }
  const cabin = cabinSeries(now), peak = cabin.reduce((m, x) => x.co2 > m.co2 ? x : m, cabin[0]);
  if (peak.co2 >= cabinReference.co2.demoLimit) {
    const minutes = cabin.filter(x => x.co2 >= cabinReference.co2.demoLimit).length * 30;
    out.push({id:`CO2-01:${dayKey(peak.time)}`, ruleId:'CO2-01', ruleVersion:RULESET_VERSION, engine:'frontend-demo', validated:false, crewId:null, metric:'co2', level:'watch',
      title:'ppCO₂ above demonstration reference', threshold:`Any 30-min sample ≥ ${cabinReference.co2.demoLimit} mmHg in the last 24 h.`,
      reason:`Peak ${peak.co2} mmHg at ${new Date(peak.time).toISOString().slice(11, 16)} UTC · about ${minutes} min above reference.`,
      observed:{value:peak.co2, unit:'mmHg', time:peak.time}, baseline:null, delta:null, riskIds:['habitat'], evaluatedAt:now});
  }
  return out;
}
