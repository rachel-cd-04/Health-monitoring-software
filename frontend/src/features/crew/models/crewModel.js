export const crew = [
  {
    id: 'ana',
    name: 'Ana Vega',
    role: 'Commander',
    initials: 'AV',
    bodyModel: 'female',
    color: '#72c8e5',
  },
  {
    id: 'leo',
    name: 'Leo Soler',
    role: 'Pilot',
    initials: 'LS',
    bodyModel: 'male',
    color: '#e9ba75',
  },
  {
    id: 'ines',
    name: 'Inés Vidal',
    role: 'Mission specialist · CMO',
    initials: 'IV',
    bodyModel: 'female',
    color: '#a6ace5',
  },
  {
    id: 'noa',
    name: 'Noa Ríos',
    role: 'Mission specialist · CMO',
    initials: 'NR',
    bodyModel: 'female',
    color: '#85c9b1',
  },
];
export const localId = () =>
  `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
export const metrics = {
  pulse: {
    label: 'Heart rate',
    short: 'Heart rate',
    unit: 'bpm',
    min: 30,
    max: 220,
    step: 1,
    description:
      'Heartbeats recorded per minute. Activity, symptoms and the measurement method give the number context.',
    why: 'Stored check-ins help the medical team follow individual cardiovascular changes.',
    guide: [
      'I confirmed the person and prepared the instrument according to its manual.',
      'The sensor is positioned as instructed and the person is secured as required by the mission.',
      'The activity context is recorded; avoidable movement has stopped.',
    ],
    quality: [
      'The instrument completed its reading and the signal or display was stable.',
      'I checked the value and unit against the instrument.',
    ],
  },
  temp: {
    label: 'Body temperature',
    short: 'Temperature',
    unit: '°C',
    min: 30,
    max: 43,
    step: 0.1,
    description: 'A temperature reading depends on the instrument and method.',
    why: 'Use recorded readings and symptoms to communicate changes to the medical team.',
    guide: [
      'I confirmed the person and checked the thermometer is ready and clean.',
      'I followed the method specified by the instrument.',
      'The instrument is positioned correctly and the measurement cycle can finish.',
    ],
    quality: [
      'The thermometer indicated that the measurement was complete.',
      'The displayed temperature and unit are recorded correctly.',
    ],
  },
  bp: {
    label: 'Blood pressure',
    short: 'Blood pressure',
    unit: 'mmHg',
    min: 60,
    max: 260,
    step: 1,
    description:
      'Record both systolic and diastolic pressure. Use the instrument and positioning procedure approved for the mission.',
    why: 'Blood pressure records provide context about cardiovascular adaptation during the flight.',
    guide: [
      'I confirmed the person and selected the correct cuff and approved instrument.',
      'The cuff is fitted according to its manual; the limb and person are positioned and secured per mission procedure.',
      'The required rest and activity conditions in the mission procedure have been met.',
    ],
    quality: [
      'The cuff cycle completed without an error or avoidable movement.',
      'Both systolic and diastolic values match the display.',
    ],
  },
  glucose: {
    label: 'Blood sugar',
    short: 'Blood sugar',
    unit: 'mg/dL',
    min: 20,
    max: 600,
    step: 1,
    description:
      'Capillary blood glucose from a finger-prick meter. Recent meals, exercise and the time of day change the value.',
    why: 'Read with meal timing. In this prototype it is an indicative marker of food and nutrition, not a nutrition assessment.',
    guide: [
      'I confirmed the person and checked the meter and test strips are in date.',
      'Hands are clean and dry; the lancet and strip are ready.',
      'I noted when the person last ate.',
    ],
    quality: [
      'The meter completed the reading without an error code.',
      'The value and unit match the meter display.',
    ],
  },
  sleep: {
    label: 'Sleep duration',
    short: 'Sleep',
    unit: 'h',
    min: 0,
    max: 24,
    step: 0.1,
    description:
      'Self-reported time actually asleep during the last rest period. Add interruptions or sleep-quality concerns.',
    why: 'Rest records help explain fatigue and support workload planning.',
    guide: [
      'I identified the most recent rest period.',
      'I separated time asleep from time spent awake in the rest period.',
      'I considered interruptions and sleep quality.',
    ],
    quality: [
      'The duration reflects the person’s report or their recorded sleep estimate.',
      'Any uncertainty or sleep-quality concern is noted.',
    ],
  },
  mood: {
    label: 'Mood',
    short: 'Mood',
    unit: '/5',
    min: 1,
    max: 5,
    step: 1,
    description: 'Self-reported mood: 1 means very low and 5 means very good.',
    why: 'Private self-reporting can help the crew ask for support during an isolated mission.',
    guide: [
      'The person understands the 1–5 demonstration scale.',
      'The response is their own current self-assessment.',
      'The person can add a private note to the check-in.',
    ],
    quality: [
      'I confirmed the selected response with the person.',
      'Any request for follow-up is recorded.',
    ],
  },
  fatigue: {
    label: 'Fatigue',
    short: 'Fatigue',
    unit: '/5',
    min: 1,
    max: 5,
    step: 1,
    description: 'Self-reported tiredness: 1 means rested and 5 means exhausted.',
    why: 'Fatigue, read with sleep, helps the crew plan workload and rest.',
    guide: ['The person understands the 1–5 scale.', 'The answer is their own current assessment.'],
    quality: ['I confirmed the selected response with the person.'],
  },
  exercise: {
    label: 'Exercise',
    short: 'Exercise',
    unit: 'min',
    min: 0,
    max: 600,
    step: 1,
    description:
      'Minutes of countermeasure exercise completed in the last day, from the exercise log or the person’s report.',
    why: 'Daily exercise protects heart, muscle and bone fitness in reduced gravity.',
    guide: ['I counted the exercise sessions completed since the last check-in.'],
    quality: ['The minutes match the exercise log or the person’s report.'],
  },
};
// Mission situations. Delays are illustrative one-way light-time figures for the demo.
export const environments = {
  station: {
    label: 'Space station',
    detail: 'Low Earth orbit · microgravity',
    link: 'Earth link · live',
    connection: 'online',
    latency: 1,
  },
  transit: {
    label: 'Spacecraft in transit',
    detail: 'Deep-space flight · microgravity',
    link: null,
    connection: 'delayed',
    latency: 8,
  },
};
export const metricOrder = [
  'pulse',
  'bp',
  'glucose',
  'temp',
  'sleep',
  'mood',
  'fatigue',
  'exercise',
];
export const deviceMetrics = ['pulse', 'bp', 'glucose', 'temp'];
export const selfMetrics = ['sleep', 'mood', 'fatigue', 'exercise'];
export const STATE_VERSION = 3;
export const slotNames = {
  daily: 'Daily',
  morning: 'Morning',
  evening: 'Evening',
  unscheduled: 'Additional assessment',
};
export const DAILY_SLOTS = ['daily', 'morning', 'evening']; // morning/evening kept for sessions saved before the single daily check-in
export const missionDay = (time = Date.now()) => new Date(time).toISOString().slice(0, 10);
export const slotTime = (day, slot, schedule) =>
  Date.parse(`${day}T${schedule[slot] || schedule.daily || '08:00'}:00Z`);
export const number = (v) => Number(v).toLocaleString('en-GB', { maximumFractionDigits: 1 });
export const timeLabel = (t) =>
  new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
export const dateLabel = (t) =>
  new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' });
export const stamp = (t) => (t ? `${dateLabel(t)}, ${timeLabel(t)} UTC` : 'Not recorded');
export const valueLabel = (r) =>
  r
    ? r.metric === 'bp'
      ? `${number(r.value)}/${r.diastolic != null ? number(r.diastolic) : '—'}`
      : number(r.value)
    : '—';
export function latest(records, crewId, metric) {
  return records
    .filter((r) => r.crewId === crewId && r.metric === metric)
    .sort((a, b) => b.time - a.time)[0];
}
export function checkIn(data, id, slot = 'daily', day = missionDay()) {
  const match = slot === 'daily' ? (s) => DAILY_SLOTS.includes(s.slot) : (s) => s.slot === slot;
  return data.sessions
    .filter((s) => s.crewId === id && match(s) && s.day === day)
    .sort((a, b) => b.time - a.time)[0];
}
export function slotStatus(data, id, slot, now = Date.now()) {
  if (checkIn(data, id, slot, missionDay(now))) return 'complete';
  return now >= slotTime(missionDay(now), slot, data.schedule) ? 'due' : 'scheduled';
}
export function nextSlot() {
  return 'daily';
}
export function createEmptyState() {
  return {
    version: STATE_VERSION,
    records: [],
    sessions: [],
    schedule: { daily: '08:00' },
    messages: [],
    crewAlerts: [],
    chatThreads: {},
    operator: 'ines',
    environment: 'station',
    connection: 'online',
    latency: 1,
    healthReports: [],
    reminderSnoozes: {},
  };
}
export const DAY_MS = 86400000;
export function missionDayNumber(data, now = Date.now()) {
  const first = data.sessions.reduce(
    (m, s) => Math.min(m, Date.parse(s.day + 'T00:00:00Z')),
    Infinity,
  );
  return Number.isFinite(first) ? Math.max(1, Math.floor((now - first) / DAY_MS) + 1) : 1;
}
export function downloadFile(name, data, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
