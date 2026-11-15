import { latest } from '../../crew/models/crewModel.js';
export { number, stamp } from '../../crew/models/crewModel.js';
// The four body zones from spec.md F2. Each groups the indicators of one body system.
export const regions = {
  head: {
    label: 'Sleep & mental health',
    short: 'Sleep & mind',
    x: 279,
    y: 62,
    detail: 'Sleep, mood and fatigue from the daily check-in.',
  },
  heart: {
    label: 'Cardiovascular',
    short: 'Heart',
    x: 298,
    y: 184,
    detail: 'Resting heart rate and blood pressure.',
  },
  body: {
    label: 'Metabolism & infection',
    short: 'Metabolism',
    x: 279,
    y: 262,
    detail: 'Blood sugar and body temperature.',
  },
  legs: {
    label: 'Muscles & bones',
    short: 'Muscles & bones',
    x: 307,
    y: 449,
    detail: 'Daily exercise minutes, the main countermeasure for fitness and bone loss.',
  },
};
export const associated = {
  head: ['sleep', 'mood', 'fatigue'],
  heart: ['pulse', 'bp'],
  body: ['glucose', 'temp'],
  legs: ['exercise'],
};
export const regionOfMetric = {
  pulse: 'heart',
  bp: 'heart',
  glucose: 'body',
  temp: 'body',
  sleep: 'head',
  mood: 'head',
  fatigue: 'head',
  exercise: 'legs',
};
export function snapshot(data, id) {
  return {
    last: data.sessions.filter((s) => s.crewId === id).sort((a, b) => b.time - a.time)[0],
    pulse: latest(data.records, id, 'pulse'),
    temp: latest(data.records, id, 'temp'),
    glucose: latest(data.records, id, 'glucose'),
  };
}
