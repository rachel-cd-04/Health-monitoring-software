import { persistMeasurement as defaultPersistMeasurement } from '../services/measurementService.js';

const metricMap = {
  heart_rate: 'pulse',
  bp_systolic: 'bp',
  blood_sugar: 'glucose',
  temperature: 'temp',
  sleep_hours: 'sleep',
  mood: 'mood',
  fatigue: 'fatigue',
  exercise_min: 'exercise',
};

const alertMetricMap = {
  ...metricMap,
  bp_diastolic: 'bp',
};

export function createMeasurementController({
  profileFor,
  setData,
  setPrivateApiSignals,
  notify,
  crew,
  persist = defaultPersistMeasurement,
}) {
  return async function saveMeasurement({ crewId, itemId, values }) {
    const profile = profileFor(crewId);
    if (!profile) throw new Error('That crew profile is not available from the backend.');

    const saved = await persist({ astronautId: Number(profile.id), itemId, values });
    const byIndicator = Object.fromEntries(
      saved.readings.map((reading) => [reading.indicator, reading]),
    );
    const records = saved.readings
      .filter((reading) => reading.indicator !== 'bp_diastolic')
      .map((reading) => ({
        id: String(reading.id),
        crewId,
        metric: metricMap[reading.indicator],
        value: Number(reading.value),
        ...(reading.indicator === 'bp_systolic'
          ? { diastolic: Number(byIndicator.bp_diastolic?.value) }
          : {}),
        time: new Date(reading.ts || saved.timestamp).getTime(),
        slot: 'unscheduled',
        source: 'Manual entry',
        context: 'Individual measurement',
        operator: crewId,
      }));

    setData((data) => ({ ...data, records: [...data.records, ...records] }));
    if (saved.alerts.length) {
      setPrivateApiSignals((signals) => ({
        ...signals,
        [crewId]: [
          ...(signals[crewId] || []),
          ...saved.alerts.map((alert) => ({
            id: `api-alert-${alert.id}`,
            ruleId: alert.rule_id,
            crewId,
            metric: alertMetricMap[alert.indicator],
            level: alert.level === 'red' ? 'review' : 'watch',
            severity: alert.level,
            short: alert.message,
            title: alert.message,
            compare: alert.value == null ? 'Active alert' : String(alert.value),
            reason: alert.message,
            whoActs: (alert.who_acts || []).join(', '),
            actions: alert.actions || [],
            observed: { value: alert.value, time: new Date(alert.ts).getTime() },
            source: alert.source,
          })),
        ],
      }));
    }

    notify(
      `${crew.find((person) => person.id === crewId).name}’s measurement saved to the health API.`,
    );
    return saved;
  };
}
