import { persistCheckIn as defaultPersistCheckIn } from '../services/checkInService.js';

/** Coordinates a check-in view action with backend persistence and application state. */
export function createCheckInController({
  profileFor,
  setData,
  setPrivateApiSignals,
  notify,
  crew,
  persistCheckIn = defaultPersistCheckIn,
}) {
  return async function saveCheckIn(session, records) {
    const profile = profileFor(session.crewId);
    if (!profile) throw new Error('That crew profile is not available from the backend.');

    const saved = await persistCheckIn({
      session,
      records,
      astronautId: profile ? Number(profile.id) : null,
    });
    setData((data) => {
      const sameCheckIn = (item) =>
        item.crewId === saved.session.crewId &&
        item.slot === saved.session.slot &&
        item.day === saved.session.day;
      const previousIds = new Set(data.sessions.filter(sameCheckIn).map((item) => item.id));
      return {
        ...data,
        sessions: [...data.sessions.filter((item) => !sameCheckIn(item)), saved.session],
        records: [
          ...data.records.filter((item) => !previousIds.has(item.sessionId)),
          ...saved.records,
        ],
      };
    });
    if (setPrivateApiSignals && saved.alerts?.length) {
      const alertMetricMap = {
        heart_rate: 'pulse',
        bp_systolic: 'bp',
        bp_diastolic: 'bp',
        blood_sugar: 'glucose',
        temperature: 'temp',
        sleep_hours: 'sleep',
        mood: 'mood',
        fatigue: 'fatigue',
        exercise_min: 'exercise',
      };
      setPrivateApiSignals((signals) => ({
        ...signals,
        [session.crewId]: [
          ...(signals[session.crewId] || []),
          ...saved.alerts.map((alert) => ({
            id: `api-alert-${alert.id}`,
            ruleId: alert.rule_id,
            crewId: session.crewId,
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
      `${crew.find((person) => person.id === session.crewId).name}’s check-in saved to the health API.`,
    );
  };
}
