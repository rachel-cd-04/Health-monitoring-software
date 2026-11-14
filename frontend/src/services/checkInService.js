import { api } from './apiClient.js';

const metricToIndicator = {
  pulse: ['heart_rate', 'bpm'],
  bp: ['bp_systolic', 'mmHg'],
  glucose: ['blood_sugar', 'mg/dL'],
  temp: ['temperature', '°C'],
  exercise: ['exercise_min', 'min'],
  sleep: ['sleep_hours', 'h'],
  mood: ['mood', '/5'],
  fatigue: ['fatigue', '/5'],
};

/** Persist a check-in using Prisma-generated IDs and the backend's API contract. */
export async function persistCheckIn(session, records, astronautId) {
  const self = Object.fromEntries(records.map(record => [record.metric, record.value]));
  const checkinResult = session.slot === 'unscheduled' ? null : await api('/api/checkins', {
    method: 'POST',
    body: {
      astronaut_id: astronautId,
      day: session.day,
      source: 'manual',
      ...(self.sleep === undefined ? {} : { sleep_hours: Number(self.sleep) }),
      ...(self.mood === undefined ? {} : { mood: Number(self.mood) }),
      ...(self.fatigue === undefined ? {} : { fatigue: Number(self.fatigue) }),
    },
  });

  const readings = records.filter(record => metricToIndicator[record.metric]).flatMap(record => {
    const [indicator, unit] = metricToIndicator[record.metric];
    const source = String(record.source || '').toLowerCase().includes('simulated') ? 'simulated' : 'manual';
    const base = {
      astronaut_id: astronautId,
      indicator,
      unit,
      source,
      ts: new Date(record.time).toISOString(),
      value: Number(record.value),
    };
    return record.metric === 'bp' && record.diastolic != null
      ? [base, { ...base, indicator: 'bp_diastolic', value: Number(record.diastolic) }]
      : [base];
  });

  const created = await Promise.all(readings.map(body => api('/api/measurements', { method: 'POST', body })));
  const ids = new Map(created.map(result => [result.measurement?.indicator, String(result.measurement?.id || '')]));
  const checkinId = checkinResult?.checkin?.id;
  const savedSession = checkinId ? { ...session, id: String(checkinId) } : session;
  const savedRecords = records.map(record => ({
    ...record,
    id: ids.get(metricToIndicator[record.metric]?.[0]) || record.id,
    sessionId: savedSession.id,
  }));

  return { session: savedSession, records: savedRecords };
}
