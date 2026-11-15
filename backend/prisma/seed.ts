import bcrypt from 'bcryptjs';
import { prisma } from '../src/db/client.js';

const sources = [
  ['nasa-hazards', 'NASA', 'NASA Human Spaceflight Hazards', 'https://www.nasa.gov/hrp/hazards/', 'web'],
  ['nasa-hazard-gravity', 'NASA', 'Hazard: gravity fields', 'https://www.nasa.gov/hrp/hazard-gravity-fields/', 'web'],
  ['nasa-hazard-isolation', 'NASA', 'Hazard: isolation and confinement', 'https://www.nasa.gov/hrp/hazard-isolation-and-confinement/', 'web'],
  ['nasa-hazard-hostile-environment', 'NASA', 'Hazard: hostile and closed environments', 'https://www.nasa.gov/hrp/hazard-hostile-closed-environments/', 'web'],
  ['nasa-risk-cardio', 'NASA', 'Risk: cardiovascular adaptations', 'https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/', 'web'],
  ['nasa-risk-sleep', 'NASA', 'Risk: inadequate sleep and irregular schedules', 'https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/', 'web'],
  ['nasa-risk-behavioral', 'NASA', 'Risk: behavioral conditions and psychiatric disorders', 'https://www.nasa.gov/reference/risk-of-behavioral-conditions-and-psychiatric-disorders/', 'web'],
  ['nasa-risk-nutrition', 'NASA', 'Risk: inadequate food and nutrition', 'https://www.nasa.gov/reference/risk-of-inadequate-food-and-nutrition/', 'web'],
  ['nasa-risk-immune', 'NASA', 'Risk: altered immune system responses', 'https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/', 'web'],
  ['nasa-risk-fitness', 'NASA', 'Risk: reduced cardiorespiratory and musculoskeletal fitness', 'https://www.nasa.gov/reference/risk-of-reduced-cardiorespiratory-and-musculoskeletal-fitness/', 'web'],
  ['nasa-risk-bone', 'NASA', 'Risk: spaceflight-induced bone changes', 'https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/', 'web'],
  ['nasa-hrp-research', 'NASA', 'Ongoing HRP Research in Space', 'https://www.nasa.gov/hrp/ongoing-hrp-research/', 'web'],
];

const crew = [
  { id: 1, name: 'Ana Vega', role: 'commander' as const, avatar: 'AV', pin: '1111' },
  { id: 2, name: 'Leo Soler', role: 'crew' as const, avatar: 'LS', pin: '2222' },
  { id: 3, name: 'Inés Vidal', role: 'crew' as const, avatar: 'IV', pin: '3333' },
  { id: 4, name: 'Noa Ríos', role: 'crew' as const, avatar: 'NR', pin: '4444' },
];

const routineNames = ['Daily check-in', 'Exercise session', 'Recovery and sleep review'];
const dailyReadings = [
  {
    heartRate: 64,
    bpSystolic: 116,
    bpDiastolic: 74,
    bloodSugar: 89,
    temperature: 36.5,
    sleepHours: 7.5,
    mood: 4,
    fatigue: 2,
    exerciseMin: 45,
  },
  {
    heartRate: 67,
    bpSystolic: 118,
    bpDiastolic: 75,
    bloodSugar: 92,
    temperature: 36.6,
    sleepHours: 7,
    mood: 4,
    fatigue: 2,
    exerciseMin: 60,
  },
  {
    heartRate: 66,
    bpSystolic: 117,
    bpDiastolic: 76,
    bloodSugar: 90,
    temperature: 36.4,
    sleepHours: 8,
    mood: 5,
    fatigue: 1,
    exerciseMin: 30,
  },
  {
    heartRate: 70,
    bpSystolic: 120,
    bpDiastolic: 77,
    bloodSugar: 96,
    temperature: 36.7,
    sleepHours: 6.5,
    mood: 4,
    fatigue: 2,
    exerciseMin: 75,
  },
  {
    heartRate: 68,
    bpSystolic: 119,
    bpDiastolic: 75,
    bloodSugar: 94,
    temperature: 36.5,
    sleepHours: 7.25,
    mood: 3,
    fatigue: 3,
    exerciseMin: 50,
  },
  {
    heartRate: 65,
    bpSystolic: 117,
    bpDiastolic: 74,
    bloodSugar: 91,
    temperature: 36.6,
    sleepHours: 8,
    mood: 4,
    fatigue: 2,
    exerciseMin: 90,
  },
  {
    heartRate: 72,
    bpSystolic: 118,
    bpDiastolic: 76,
    bloodSugar: 93,
    temperature: 36.6,
    sleepHours: 7,
    mood: 4,
    fatigue: 2,
    exerciseMin: 60,
  },
] as const;

const measurementFields = [
  ['heart_rate', 'heartRate', 'bpm'],
  ['bp_systolic', 'bpSystolic', 'mmHg'],
  ['bp_diastolic', 'bpDiastolic', 'mmHg'],
  ['blood_sugar', 'bloodSugar', 'mg/dL'],
  ['temperature', 'temperature', '°C'],
  ['sleep_hours', 'sleepHours', 'h'],
  ['mood', 'mood', '1–5'],
  ['fatigue', 'fatigue', '1–5'],
  ['exercise_min', 'exerciseMin', 'min'],
] as const;

async function main() {
  const accessedOn = new Date();
  accessedOn.setHours(0, 0, 0, 0);

  for (const [id, agency, title, url, docType] of sources) {
    await prisma.source.upsert({
      where: { id },
      update: { agency, title, url, docType, accessedOn },
      create: { id, agency, title, url, docType, accessedOn },
    });
  }

  for (const [ruleId, sourceId] of [
    ['S-01', 'nasa-risk-sleep'],
    ['M-01', 'nasa-risk-behavioral'],
    ['C-01', 'nasa-risk-cardio'],
    ['C-02', 'nasa-risk-cardio'],
    ['G-01', 'nasa-risk-nutrition'],
    ['T-01', 'nasa-risk-immune'],
    ['E-01', 'nasa-risk-fitness'],
    ['X-01', 'nasa-hazards'],
  ]) {
    await prisma.rule.updateMany({ where: { id: ruleId }, data: { sourceId } });
  }
  await prisma.source.deleteMany({ where: { id: { notIn: sources.map(([id]) => id) } } });

  const missionStart = new Date(Date.now() - 89 * 86400000);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (const person of crew) {
    const pinHash = await bcrypt.hash(person.pin, 10);
    const astronaut = await prisma.astronaut.upsert({
      where: { id: person.id },
      update: { name: person.name, role: person.role, avatar: person.avatar, pinHash, missionStart },
      create: { id: person.id, name: person.name, role: person.role, avatar: person.avatar, pinHash, missionStart },
    });

    for (const item of routineNames) {
      const existing = await prisma.routineItem.findFirst({ where: { astronautId: astronaut.id, item } });
      if (!existing) {
        await prisma.routineItem.create({
          data: { astronautId: astronaut.id, item, dueAt: new Date() },
        });
      }
    }

    for (const [index, sample] of dailyReadings.entries()) {
      const daysAgo = dailyReadings.length - index - 1;
      const day = new Date(today);
      day.setUTCDate(day.getUTCDate() - daysAgo);
      const nextDay = new Date(day);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      const timestamp = new Date(day);
      timestamp.setUTCHours(12, 0, 0, 0);

      const crewOffset = person.id - 1;
      const reading = {
        heartRate: sample.heartRate + crewOffset * 2,
        bpSystolic: sample.bpSystolic + crewOffset,
        bpDiastolic: sample.bpDiastolic + Math.floor(crewOffset / 2),
        bloodSugar: sample.bloodSugar + crewOffset * 2,
        temperature: Number((sample.temperature + crewOffset * 0.05).toFixed(2)),
        sleepHours: Number(Math.max(6, sample.sleepHours - crewOffset * 0.1).toFixed(2)),
        mood: Math.max(1, Math.min(5, sample.mood + (crewOffset % 3) - 1)),
        fatigue: Math.max(1, Math.min(5, sample.fatigue + ((crewOffset + 1) % 3) - 1)),
        exerciseMin: sample.exerciseMin + crewOffset * 5,
      };

      await prisma.checkin.upsert({
        where: { astronautId_day: { astronautId: astronaut.id, day } },
        update: { ...reading, source: 'simulated' },
        create: { astronautId: astronaut.id, day, ...reading, source: 'simulated' },
      });

      for (const [indicator, field, unit] of measurementFields) {
        const existing = await prisma.measurement.findFirst({
          where: {
            astronautId: astronaut.id,
            indicator,
            source: 'simulated',
            ts: { gte: day, lt: nextDay },
          },
          orderBy: { ts: 'asc' },
        });
        const data = {
          value: reading[field],
          unit,
          ts: timestamp,
          source: 'simulated' as const,
          missionPhase: 'in_flight' as const,
        };

        if (existing) {
          await prisma.measurement.update({ where: { id: existing.id }, data });
        } else {
          await prisma.measurement.create({
            data: { astronautId: astronaut.id, indicator, ...data },
          });
        }
      }
    }
  }
}

main()
  .catch((error) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
