// Cabin atmosphere — SYNTHETIC demonstration data (no cabin sensor is connected). Values are
// deterministic per half hour so the demo is reproducible; magnitudes are illustrative.
// Radiation lives in ./radiation.js and comes from the backend record (GET /api/radiation/events).
import { RULESET_VERSION } from '../../alerts/models/rules.js';

const noise = (seed) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};
const dayKey = (t) => new Date(t).toISOString().slice(0, 10);
/** Cabin atmosphere over the last 24 h, 30-minute samples (simulated). */
export function cabinSeries(now = Date.now()) {
  const end = Math.floor(now / 1800000) * 1800000;
  return Array.from({ length: 48 }, (_, i) => {
    const t = end - (47 - i) * 1800000,
      h = new Date(t).getUTCHours() + new Date(t).getUTCMinutes() / 60,
      n = noise(t / 1800000);
    const exercise = h >= 14 && h < 15.5; // crew exercise block raises local ppCO2 in this scenario
    return {
      time: t,
      temp: +(22.3 + Math.sin((h / 24) * Math.PI * 2) * 0.35 + n * 0.2).toFixed(1),
      pressure: +(101.2 + n * 0.2).toFixed(1),
      co2: +(2.7 + n * 0.4 + (exercise ? 1.4 : 0)).toFixed(1),
      humidity: Math.round(44 + n * 6),
    };
  });
}

export const cabinReference = {
  temp: { label: 'Cabin temperature', unit: '°C' },
  pressure: { label: 'Total pressure', unit: 'kPa' },
  co2: { label: 'ppCO₂', unit: 'mmHg', demoLimit: 4.0 },
  humidity: { label: 'Relative humidity', unit: '%' },
};

/** Cabin environment signals use the same contract as physiological signals (crewId:null).
 *  Radiation signals (RAD-01) come from radiationSignals() in ./radiation.js. */
export function environmentSignals(now = Date.now()) {
  const out = [];
  const cabin = cabinSeries(now),
    peak = cabin.reduce((m, x) => (x.co2 > m.co2 ? x : m), cabin[0]);
  if (peak.co2 >= cabinReference.co2.demoLimit) {
    const minutes = cabin.filter((x) => x.co2 >= cabinReference.co2.demoLimit).length * 30;
    out.push({
      id: `CO2-01:${dayKey(peak.time)}`,
      ruleId: 'CO2-01',
      ruleVersion: RULESET_VERSION,
      engine: 'frontend-demo',
      validated: false,
      crewId: null,
      metric: 'co2',
      level: 'watch',
      title: 'ppCO₂ above demonstration reference',
      threshold: `Any 30-min sample ≥ ${cabinReference.co2.demoLimit} mmHg in the last 24 h.`,
      reason: `Peak ${peak.co2} mmHg at ${new Date(peak.time).toISOString().slice(11, 16)} UTC · about ${minutes} min above reference.`,
      observed: { value: peak.co2, unit: 'mmHg', time: peak.time },
      baseline: null,
      delta: null,
      riskIds: ['habitat'],
      evaluatedAt: now,
    });
  }
  return out;
}
