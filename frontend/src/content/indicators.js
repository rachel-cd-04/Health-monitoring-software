// Static content for the demo. All thresholds and ranges are ILLUSTRATIVE.

// TODO: replace these URLs with the exact links from the challenge Resources tab / resource guide (section 7).
// Only the 5 Hazards page and OSDR are well-known; the risk pages point to the HRP area and must be verified.
const RISKS_URL = 'https://www.nasa.gov/humans-in-space/human-research-program/';
export const SOURCES = {
  'nasa-hazards': { agency: 'NASA', title: '5 Hazards of Human Spaceflight', url: 'https://www.nasa.gov/humans-in-space/five-hazards-of-human-spaceflight/' },
  'nasa-risks-cardio': { agency: 'NASA', title: 'Risks of Human Spaceflight — Cardiovascular Adaptations', url: RISKS_URL },
  'nasa-risks-sleep': { agency: 'NASA', title: 'Risks of Human Spaceflight — Inadequate Sleep and Irregular Schedules', url: RISKS_URL },
  'nasa-risks-behavioral': { agency: 'NASA', title: 'Risks of Human Spaceflight — Behavioral Changes and Psychiatric Disorders', url: RISKS_URL },
  'nasa-risks-nutrition': { agency: 'NASA', title: 'Risks of Human Spaceflight — Inadequate Food and Nutrition', url: RISKS_URL },
  'nasa-risks-immune': { agency: 'NASA', title: 'Risks of Human Spaceflight — Altered Immune System Responses', url: RISKS_URL },
  'nasa-risks-fitness': { agency: 'NASA', title: 'Risks of Human Spaceflight — Reduced Cardiorespiratory and Musculoskeletal Fitness', url: RISKS_URL },
  'nasa-risks-bone': { agency: 'NASA', title: 'Risks of Human Spaceflight — Spaceflight-Induced Bone Changes', url: RISKS_URL },
  'nasa-hrp-research': { agency: 'NASA', title: 'Ongoing HRP Research in Space', url: RISKS_URL },
  'nasa-osdr': { agency: 'NASA', title: 'Open Science Data Repository (OSDR)', url: 'https://osdr.nasa.gov/' },
  'mission-medical-procedure': { agency: 'Mission', title: 'Your mission medical procedures (generic, illustrative)', url: null },
};

// The 8 MVP indicators (blood pressure has two values). Ranges are input validation, not alert thresholds.
export const INDICATORS = {
  heart_rate: { label: 'Heart rate', short: 'Heart rate', unit: 'bpm', min: 30, max: 220, step: 1, system: 'cardio', guide: 'heart_rate' },
  bp_systolic: { label: 'Systolic pressure', short: 'Systolic BP', unit: 'mmHg', min: 60, max: 260, step: 1, system: 'cardio', guide: 'blood_pressure' },
  bp_diastolic: { label: 'Diastolic pressure', short: 'Diastolic BP', unit: 'mmHg', min: 30, max: 160, step: 1, system: 'cardio', guide: 'blood_pressure' },
  blood_sugar: { label: 'Blood sugar', short: 'Blood sugar', unit: 'mg/dL', min: 20, max: 600, step: 1, system: 'metabolic', guide: 'blood_sugar' },
  temperature: { label: 'Body temperature', short: 'Temperature', unit: '°C', min: 30, max: 43, step: 0.1, system: 'metabolic', guide: 'temperature' },
  sleep_hours: { label: 'Sleep', short: 'Sleep', unit: 'h', min: 0, max: 24, step: 0.1, system: 'mental', guide: 'sleep' },
  mood: { label: 'Mood', short: 'Mood', unit: '/5', min: 1, max: 5, step: 1, system: 'mental', guide: 'mood' },
  fatigue: { label: 'Fatigue', short: 'Fatigue', unit: '/5', min: 1, max: 5, step: 1, system: 'mental', guide: 'fatigue' },
  exercise_min: { label: 'Exercise', short: 'Exercise', unit: 'min', min: 0, max: 600, step: 1, system: 'musculo', guide: 'exercise' },
};

// What the "Log measurement" picker offers (blood pressure takes two fields).
export const LOG_ITEMS = [
  { id: 'heart_rate', label: 'Heart rate', fields: ['heart_rate'], guide: 'heart_rate' },
  { id: 'blood_pressure', label: 'Blood pressure', fields: ['bp_systolic', 'bp_diastolic'], guide: 'blood_pressure' },
  { id: 'blood_sugar', label: 'Blood sugar', fields: ['blood_sugar'], guide: 'blood_sugar' },
  { id: 'temperature', label: 'Body temperature', fields: ['temperature'], guide: 'temperature' },
  { id: 'sleep_hours', label: 'Sleep', fields: ['sleep_hours'], guide: 'sleep' },
  { id: 'mood', label: 'Mood', fields: ['mood'], guide: 'mood' },
  { id: 'fatigue', label: 'Fatigue', fields: ['fatigue'], guide: 'fatigue' },
  { id: 'exercise_min', label: 'Exercise', fields: ['exercise_min'], guide: 'exercise' },
];

// Order of the guided check-in. Sleep is asked once a day; the rest can be repeated (2+ check-ins per day).
export const CHECKIN_ORDER = ['sleep_hours', 'mood', 'fatigue', 'heart_rate', 'blood_pressure', 'temperature', 'blood_sugar', 'exercise_min'];
export const CHECKINS_PER_DAY = 2;

export const SYSTEMS = {
  cardio: { name: 'Cardiovascular', zone: 'Heart / chest', hazard: 'Gravity fields', indicators: ['heart_rate', 'bp_systolic', 'bp_diastolic'] },
  mental: { name: 'Sleep & mental health', zone: 'Head / brain', hazard: 'Isolation & confinement', indicators: ['sleep_hours', 'mood', 'fatigue'] },
  metabolic: { name: 'Metabolism & infection', zone: 'Whole body / skin', hazard: 'Hostile / closed environment', indicators: ['blood_sugar', 'temperature'] },
  musculo: { name: 'Muscles & bones', zone: 'Legs / bones', hazard: 'Gravity fields', indicators: ['exercise_min'] },
};
export const SYSTEM_ORDER = ['cardio', 'mental', 'metabolic', 'musculo'];

export const GUIDES = {
  heart_rate: {
    title: 'Heart rate', source: 'nasa-risks-cardio',
    steps: ['Sit or secure yourself comfortably and rest for 5 minutes.', 'Put the sensor or fingertip monitor on as its manual describes.', 'Stay still and wait for a stable reading.', 'Enter the value and note if you just exercised.'],
    why: 'Microgravity changes how the heart and vessels work. Your own resting heart rate trend can show adaptation or strain early.',
    range: '60–100 bpm at rest (typical adult; illustrative).',
    abnormal: ['Rest 5 minutes and measure again.', 'Note symptoms (dizziness, chest discomfort, shortness of breath).', 'If it stays high or you feel unwell, tell a crewmate and the on-board medical officer.'],
  },
  blood_pressure: {
    title: 'Blood pressure', source: 'nasa-risks-cardio',
    steps: ['Sit or secure yourself and rest quietly for 5 minutes.', 'Place the cuff on your upper arm at heart level.', 'Stay still, do not talk, and let the device finish.', 'Enter the systolic (top) and diastolic (bottom) numbers.'],
    why: 'Fluid shifts in microgravity affect the cardiovascular system. A single reading is not a diagnosis; the trend is what helps.',
    range: 'About 90–120 systolic and 60–80 diastolic (typical adult; illustrative).',
    abnormal: ['Rest 5 minutes and measure again before acting on the value.', 'If still out of range, tell a crewmate.', 'If it stays out of range, contact the flight surgeon (allow for the communication delay).'],
  },
  blood_sugar: {
    title: 'Blood sugar', source: 'nasa-risks-nutrition',
    steps: ['Wash and dry your hands.', 'Insert a test strip into the meter.', 'Prick the side of a fingertip with the lancet and touch the blood to the strip.', 'Wait for the result and enter it, noting when you last ate.'],
    why: 'Diet and stress change in a closed environment. Blood sugar is linked here to nutrition risks (indicative link).',
    range: 'About 70–140 mg/dL depending on when you ate (illustrative).',
    abnormal: ['Repeat the measurement to confirm.', 'Check when you last ate and follow your on-board nutrition plan.', 'Tell a crewmate; contact the flight surgeon if it stays out of range.'],
  },
  temperature: {
    title: 'Body temperature', source: 'nasa-risks-immune',
    steps: ['Check the thermometer is clean and working.', 'Use the measurement site given in its manual.', 'Wait for the beep or reading to finish.', 'Enter the value and any symptoms.'],
    why: 'Immune responses can change in spaceflight. Temperature is an indicative sign that the body may be fighting something.',
    range: 'About 36.1–37.5 °C (illustrative).',
    abnormal: ['Rest, drink water and measure again in 30 minutes.', 'Note other symptoms (cough, aches, chills).', 'Tell a crewmate if it stays at 38.0 °C or higher.'],
  },
  sleep: {
    title: 'Sleep', source: 'nasa-risks-sleep',
    steps: ['Check your sleep log or tracker if you use one.', 'Estimate the hours you actually slept.', 'Enter the number of hours.'],
    why: 'Irregular schedules, workload and confinement make sleep loss common on long missions, and it affects alertness and mood.',
    range: '7–9 hours per night (typical adult; illustrative).',
    abnormal: ['Check cabin lighting and your sleep schedule.', 'Avoid caffeine and screens before your rest period.', 'If it continues for several nights, report it at the next ground contact.'],
  },
  mood: {
    title: 'Mood', source: 'nasa-risks-behavioral',
    steps: ['Think about how you feel right now, not how you felt yesterday.', 'Pick a number from 1 (very low) to 5 (very good).', 'This is a self-reported scale, not a clinical test.'],
    why: 'Isolation and confinement can affect mood. Tracking it helps you and the crew notice changes early.',
    range: '3–5 on most days (illustrative).',
    abnormal: ['Talk to a crewmate or schedule a call with family.', 'Review workload and rest periods.', 'If you feel low for several days, ask for support from the crew or ground.'],
  },
  fatigue: {
    title: 'Fatigue', source: 'nasa-risks-sleep',
    steps: ['Think about how tired you feel right now.', 'Pick a number from 1 (fresh) to 5 (exhausted).'],
    why: 'Fatigue builds up with sleep loss and heavy workload, and it raises the risk of mistakes.',
    range: '1–3 on most days (illustrative).',
    abnormal: ['Plan a rest period and avoid risky tasks.', 'Check your sleep over the last few nights.', 'If fatigue stays high, tell a crewmate or the flight surgeon.'],
  },
  exercise: {
    title: 'Exercise', source: 'nasa-risks-fitness',
    steps: ['Add up the minutes of exercise you did today.', 'Include resistance and cardio sessions.', 'Enter the total minutes.'],
    why: 'Without gravity loading, muscles and bones weaken. Exercise is the main countermeasure; this app tracks it as indirect context only.',
    range: 'About 60–120 minutes per day on station (illustrative).',
    abnormal: ['Schedule your session in today\'s routine.', 'Short sessions still help.', 'If you cannot exercise (injury, equipment), tell the crew or ground.'],
  },
};
