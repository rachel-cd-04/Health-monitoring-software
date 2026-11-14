import { persistCheckIn } from '../services/checkInService.js';

/** Coordinates a check-in view action with backend persistence and application state. */
export function createCheckInController({ profileFor, setData, notify, crew }) {
  return async function saveCheckIn(session, records) {
    const profile = profileFor(session.crewId);
    if (!profile) throw new Error('That crew profile is not available from the backend.');

    const saved = await persistCheckIn(session, records, Number(profile.id));
    setData(data => {
      const sameCheckIn = item => item.crewId === saved.session.crewId
        && item.slot === saved.session.slot
        && item.day === saved.session.day;
      const previousIds = new Set(data.sessions.filter(sameCheckIn).map(item => item.id));
      return {
        ...data,
        sessions: [...data.sessions.filter(item => !sameCheckIn(item)), saved.session],
        records: [...data.records.filter(item => !previousIds.has(item.sessionId)), ...saved.records],
      };
    });
    notify('Check-in saved to the health API for ' + crew.find(person => person.id === session.crewId).name);
  };
}
