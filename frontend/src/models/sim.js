// Mission simulator: 4 fictional astronauts, scripted story. ALL data is synthetic (source = 'simulated').
export const DAY = 86400000;
export const MISSION_DAY = 90;      // "today" in the demo
export const MISSION_LENGTH = 180;

export const CREW = [
  { id: 'ana', name: 'Ana Vega', role: 'Commander', initials: 'AV', color: '#72c8e5', commander: true,
    base: { heart_rate: 62, bp_systolic: 116, bp_diastolic: 74, blood_sugar: 90, temperature: 36.5, sleep_hours: 7.5, mood: 4, fatigue: 2, exercise_min: 85 } },
  { id: 'leo', name: 'Leo Soler', role: 'Pilot', initials: 'LS', color: '#e9ba75',
    base: { heart_rate: 70, bp_systolic: 120, bp_diastolic: 76, blood_sugar: 92, temperature: 36.6, sleep_hours: 7.0, mood: 4, fatigue: 2, exercise_min: 75 } },
  { id: 'ines', name: 'Inés Vidal', role: 'Specialist · Medical officer', initials: 'IV', color: '#a6ace5',
    base: { heart_rate: 66, bp_systolic: 112, bp_diastolic: 72, blood_sugar: 88, temperature: 36.6, sleep_hours: 7.8, mood: 4, fatigue: 2, exercise_min: 90 } },
  { id: 'noa', name: 'Noa Ríos', role: 'Specialist · Engineer', initials: 'NR', color: '#85c9b1',
    base: { heart_rate: 65, bp_systolic: 118, bp_diastolic: 75, blood_sugar: 94, temperature: 36.7, sleep_hours: 7.2, mood: 4, fatigue: 2, exercise_min: 80 } },
];

export const MISSION_EVENTS = [
  { day: 41, label: 'EVA' },
  { day: 63, label: 'Solar storm' },
  { day: 78, label: 'EVA' },
];

function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Scripted story. Leo (days 84-89): rising heart rate and blood pressure, poor sleep, low exercise
// -> chest pain event around day 90. Noa: a few days of low exercise (amber only).
const LEO = {
  heart_rate: [3, 7, 12, 17, 21, 25].map(v => 70 + v),
  bp_systolic: [2, 5, 9, 14, 20, 26].map(v => 120 + v),
  bp_diastolic: [1, 3, 5, 8, 11, 14].map(v => 76 + v),
  temperature: [36.6, 36.7, 36.7, 36.8, 36.9, 37.0],
  sleep_hours: [6.6, 6.3, 6.0, 5.6, 5.2, 4.8],
  fatigue: [2, 3, 3, 4, 4, 5],
  mood: [4, 4, 3, 3, 3, 3],
  exercise_min: [60, 55, 50, 40, 35, 30],
};
function story(id, d) {
  if (id === 'leo' && d >= 84) {
    const i = d - 84;
    return Object.fromEntries(Object.entries(LEO).map(([k, arr]) => [k, arr[i]]));
  }
  if (id === 'noa' && d >= 85) return { exercise_min: [48, 45, 40, 42, 38][d - 85] };
  return null;
}

export function generate(start) {
  const records = [];
  let n = 0;
  CREW.forEach((p, pi) => {
    const r = rng(1000 + pi * 77);
    const noise = k => (r() + r() + r() - 1.5) * k;
    for (let d = 1; d < MISSION_DAY; d++) {
      const s = story(p.id, d) || {};
      const at = h => start + (d - 1) * DAY + h * 3600000;
      const put = (indicator, raw, unit, h, dec = 0, lo = -Infinity, hi = Infinity) => {
        const v = Math.min(hi, Math.max(lo, raw));
        records.push({ id: 's' + (n++), astroId: p.id, indicator, value: +v.toFixed(dec), unit, ts: at(h), day: d, source: 'simulated' });
      };
      const b = p.base;
      put('sleep_hours', s.sleep_hours ?? b.sleep_hours + noise(0.7), 'h', 8, 1, 3, 10);
      put('mood', Math.round(s.mood ?? b.mood + noise(1.1)), '/5', 8, 0, 1, 5);
      put('fatigue', Math.round(s.fatigue ?? b.fatigue + noise(1.1)), '/5', 8, 0, 1, 5);
      put('heart_rate', s.heart_rate ?? b.heart_rate + noise(3), 'bpm', 9);
      put('bp_systolic', s.bp_systolic ?? b.bp_systolic + noise(5), 'mmHg', 9);
      put('bp_diastolic', s.bp_diastolic ?? b.bp_diastolic + noise(4), 'mmHg', 9);
      put('temperature', s.temperature ?? b.temperature + noise(0.25), '°C', 9, 1);
      if (d % 2 === 0) put('blood_sugar', b.blood_sugar + noise(9), 'mg/dL', 12);
      put('exercise_min', s.exercise_min ?? b.exercise_min + noise(18), 'min', 17, 0, 0);
    }
  });
  return records;
}
