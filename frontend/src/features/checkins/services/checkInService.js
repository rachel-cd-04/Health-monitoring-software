import { api } from '../../../shared/api/apiClient.js';

const metricToIndicator = {
  pulse: ['heart_rate', 'bpm'],
  bp: ['bp_systolic', 'mmHg'],
  glucose: ['blood_sugar', 'mg/dL'],
  temp: ['temperature', '°C'],
  exercise: ['exercise_min', 'min'],
  sleep: ['sleep_hours', 'h'],
  mood: ['mood', '1–5'],
  fatigue: ['fatigue', '1–5'],
};

const checkinFields = {
  pulse: 'heart_rate',
  bp: 'bp_systolic',
  glucose: 'blood_sugar',
  temp: 'temperature',
  sleep: 'sleep_hours',
  mood: 'mood',
  fatigue: 'fatigue',
  exercise: 'exercise_min',
};

function mapReadings(records, astronautId) {
  return records.flatMap((record) => {
    const [indicator, unit] = metricToIndicator[record.metric] || [];
    if (!indicator) return [];
    const source = String(record.source || '')
      .toLowerCase()
      .includes('simulated')
      ? 'simulated'
      : 'manual';
    const measurement = {
      astronaut_id: astronautId,
      indicator,
      unit,
      source,
      ts: new Date(record.time).toISOString(),
      value: Number(record.value),
    };
    return record.metric === 'bp' && record.diastolic != null
      ? [
          measurement,
          { ...measurement, indicator: 'bp_diastolic', value: Number(record.diastolic) },
        ]
      : [measurement];
  });
}

/** Persist daily check-ins once; additional readings use the measurements endpoint. */
export async function persistCheckIn({ session, records, astronautId }) {
  let alerts = [];
  const ids = new Map();

  if (session.slot === 'unscheduled') {
    const created = await Promise.all(
      mapReadings(records, astronautId).map((body) =>
        api('/api/measurements', { method: 'POST', body }),
      ),
    );
    alerts = created.flatMap((result) => result.alerts || []);
    for (const result of created) {
      if (result.measurement?.indicator) {
        ids.set(result.measurement.indicator, String(result.measurement.id));
      }
    }
  } else {
    const self = Object.fromEntries(records.map((record) => [record.metric, record.value]));
    const bloodPressure = records.find((record) => record.metric === 'bp');
    const source = records.some((record) =>
      String(record.source || '')
        .toLowerCase()
        .includes('simulated'),
    )
      ? 'simulated'
      : 'manual';
    const result = await api('/api/checkins', {
      method: 'POST',
      body: {
        astronaut_id: astronautId,
        day: session.day,
        source,
        ...Object.fromEntries(
          Object.entries(checkinFields)
            .filter(([metric]) => self[metric] !== undefined)
            .map(([metric, field]) => [field, Number(self[metric])]),
        ),
        ...(bloodPressure?.diastolic == null
          ? {}
          : { bp_diastolic: Number(bloodPressure.diastolic) }),
      },
    });
    alerts = result.alerts || [];
    const checkinId = result.checkin?.id;
    for (const record of records) {
      const indicator = metricToIndicator[record.metric]?.[0];
      if (indicator && checkinId) ids.set(indicator, `${checkinId}:${indicator}`);
    }
  }

  const savedSession = ids.size ? { ...session, id: `${session.id}:saved` } : session;
  const savedRecords = records.map((record) => ({
    ...record,
    id: ids.get(metricToIndicator[record.metric]?.[0]) || record.id,
    sessionId: savedSession.id,
  }));

  return { session: savedSession, records: savedRecords, alerts };
}
