import { prisma } from '../src/db/client.js';

// ── Radiation context (F13, HM-13) ─────────────────────────────────────────────────────────────
// SIMULATED mission radiation record: no dosimeter is connected. Magnitudes are in the range reported
// for low Earth orbit (roughly 0.3–0.8 mSv/day inside the vehicle); they are illustrative, never a
// health verdict. Deterministic (seeded noise) so every run of the seed tells the same story.
const HOUR = 3600000;
const DAY = 24 * HOUR;
const noise = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};
const round = (value: number, digits = 3) => Number(value.toFixed(digits));

const CABIN_TEPC = 'Cabin tissue-equivalent proportional counter (simulated)';
const MIXED_FIELD = 'Mixed field (GCR + trapped protons)';
// Solar particle events: [days before today, onset hour UTC, extra cabin dose mSv, peak dose rate µSv/h]
const SOLAR_EVENTS: Array<[number, number, number, number]> = [
  [52, 14, 0.42, 120],
  [2, 6, 1.1, 310],
];
// Modules with their own area dosimeter. `location` is free text: `cabin` is the vehicle average
// (TEPC), these are the individual modules. level = share of the cabin average; speFactor = how much
// a solar event multiplies that module's day.
const MODULES = [
  { id: 'lab', level: 1.0, speFactor: 2.4, seed: 1, instrument: 'Area dosimeter A-1 (simulated)' },
  { id: 'quarters', level: 0.85, speFactor: 1.9, seed: 2, instrument: 'Area dosimeter A-2 (simulated)' },
  { id: 'galley', level: 1.04, speFactor: 2.6, seed: 3, instrument: 'Area dosimeter A-3 (simulated)' },
  { id: 'cupola', level: 1.22, speFactor: 3.4, seed: 4, instrument: 'Area dosimeter A-4 (simulated)' },
  { id: 'shelter', level: 0.65, speFactor: 1.3, seed: 5, instrument: 'Storm-shelter area dosimeter (simulated)' },
];
// EVAs: [days before today, start hour UTC, hours, dose mSv]
const EVAS: Array<[number, number, number, number]> = [
  [28, 8, 6.5, 0.27],
  [4, 9, 6.5, 0.29],
];

export function radiationRecords(missionStart: Date, today: Date) {
  const records: Array<{
    ts: Date;
    doseMsv: number | null;
    doseRateUsvH: number | null;
    radiationType: string;
    location: string;
    instrument: string;
    eventType: string;
    source: 'simulated';
  }> = [];
  const add = (r: Omit<(typeof records)[number], 'source'>) => records.push({ ...r, source: 'simulated' });
  const firstDay = new Date(missionStart);
  firstDay.setUTCHours(0, 0, 0, 0);
  const spe = new Map(SOLAR_EVENTS.map(([ago, ...rest]) => [today.getTime() - ago * DAY, rest]));

  // 1. Daily cabin dose, vehicle average (completed UTC days, mission start → yesterday). A solar event
  //    adds to its day. This average drives the mission total and the RAD-01 signal.
  for (let day = firstDay.getTime(); day < today.getTime(); day += DAY) {
    const rate = 21 * (0.92 + noise(day / DAY) * 0.16); // µSv/h background
    const extra = spe.get(day)?.[1] ?? 0;
    const dose = (rate * 24) / 1000 + extra;
    add({ ts: new Date(day + DAY - 60000), doseMsv: round(dose), doseRateUsvH: round((dose * 1000) / 24, 1), radiationType: extra ? 'Mixed field + SPE protons' : MIXED_FIELD, location: 'cabin', instrument: CABIN_TEPC, eventType: 'daily_total' });
  }

  // 1b. Daily dose per module (area dosimeters). Shielding differs, so each module has its own level and
  //     its own response to a solar event (the cupola is the least shielded, the storm shelter the most).
  for (const module of MODULES) {
    for (let day = firstDay.getTime(); day < today.getTime(); day += DAY) {
      const rate = 21 * module.level * (0.94 + noise(day / DAY + module.seed) * 0.12);
      const isSpe = spe.has(day);
      const dose = ((rate * 24) / 1000) * (isSpe ? module.speFactor : 1);
      add({ ts: new Date(day + DAY - 60000), doseMsv: round(dose), doseRateUsvH: round((dose * 1000) / 24, 1), radiationType: isSpe ? 'Mixed field + SPE protons' : MIXED_FIELD, location: module.id, instrument: module.instrument, eventType: 'daily_total' });
    }
  }

  // 2. Hourly cabin dose-rate samples for the last 24 h (the "current dose rate").
  const lastHour = Math.floor(Date.now() / HOUR) * HOUR;
  for (let t = lastHour - 23 * HOUR; t <= lastHour; t += HOUR) {
    const h = new Date(t).getUTCHours();
    const saa = h % 6 === 3 ? 1.6 : 1; // passes through the South Atlantic Anomaly raise the rate briefly
    add({ ts: new Date(t), doseMsv: null, doseRateUsvH: round(20 * (0.93 + noise(t / HOUR) * 0.14) * saa, 1), radiationType: saa > 1 ? 'Trapped protons (SAA pass)' : MIXED_FIELD, location: 'cabin', instrument: CABIN_TEPC, eventType: 'rate_sample' });
  }

  // 3. Solar particle events and the storm-shelter periods that followed them.
  for (const [ago, hour, extra, peak] of SOLAR_EVENTS) {
    const onset = today.getTime() - ago * DAY + hour * HOUR;
    if (onset < firstDay.getTime()) continue;
    add({ ts: new Date(onset), doseMsv: extra, doseRateUsvH: peak, radiationType: 'Solar particle event (protons)', location: 'cabin', instrument: CABIN_TEPC, eventType: 'solar_particle_event' });
    add({ ts: new Date(onset + 1.5 * HOUR), doseMsv: round(extra * 0.15), doseRateUsvH: round(peak * 0.12, 1), radiationType: 'Solar particle event (protons)', location: 'shelter', instrument: 'Storm-shelter area dosimeter (simulated)', eventType: 'shelter_period' });
  }

  // 4. Extravehicular activities (badge dosimeter).
  for (const [ago, hour, hours, dose] of EVAS) {
    const start = today.getTime() - ago * DAY + hour * HOUR;
    if (start < firstDay.getTime()) continue;
    add({ ts: new Date(start), doseMsv: dose, doseRateUsvH: round((dose * 1000) / hours, 1), radiationType: 'Trapped protons + GCR', location: 'eva', instrument: 'EVA badge dosimeter (simulated)', eventType: 'eva' });
  }

  // 5. Weekly neutron survey (neutrons are a large share of the dose inside a spacecraft).
  for (let day = firstDay.getTime() + 6 * DAY; day < today.getTime(); day += 7 * DAY) {
    const rate = 6 * (0.9 + noise(day / DAY + 7) * 0.2);
    add({ ts: new Date(day + 10 * HOUR), doseMsv: round((rate * 24 * 7) / 1000), doseRateUsvH: round(rate, 1), radiationType: 'Neutrons', location: 'cabin', instrument: 'Bubble-detector neutron dosimeter set (simulated)', eventType: 'neutron_survey' });
  }
  return records;
}

/** Replace ONLY the simulated radiation rows (imported or sensor rows are never touched). */
export async function refreshSimulatedRadiation(missionStart: Date, today: Date) {
  const records = radiationRecords(missionStart, today);
  await prisma.$transaction([
    prisma.radiationEvent.deleteMany({ where: { source: 'simulated' } }),
    prisma.radiationEvent.createMany({ data: records }),
  ]);
  return records.length;
}
