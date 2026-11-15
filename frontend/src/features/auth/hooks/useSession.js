import { useEffect, useState } from 'react';
import { crew } from '../../crew/models/crewModel.js';
import { LOCKED, canView, isExpired, isUnlocked } from '../models/access.js';
import { api, apiConfigured, setApiToken } from '../../../shared/api/apiClient.js';
import { queryClient } from '../../../app/queryClient.js';
import { crewStatusKey, fetchCrewStatus } from '../../crew/hooks/crewQueries.js';
import { checkinsKey, fetchCheckins } from '../../checkins/hooks/useCheckins.js';

/** Fetch one astronaut's private data from the API and map it to the app's records, sessions and signals. */
async function loadPersonData(personId, profile) {
  const snapshot = await queryClient.fetchQuery({
    queryKey: crewStatusKey(profile.id),
    queryFn: () => fetchCrewStatus(profile.id),
  });
  const checkins = await queryClient.fetchQuery({
    queryKey: checkinsKey(profile.id),
    queryFn: () => fetchCheckins(profile.id),
  });
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
  const measurements = (snapshot.systems || []).flatMap((system) => system.latest || []);
  const dailyDays = new Set(checkins.map((checkin) => String(checkin.day).slice(0, 10)));
  const diastolic = new Map(
    measurements
      .filter((measurement) => measurement.indicator === 'bp_diastolic')
      .map((measurement) => [new Date(measurement.ts).getTime(), Number(measurement.value)]),
  );
  const records = measurements
    .filter((measurement) => metricMap[measurement.indicator])
    .map((measurement) => {
      const time = new Date(measurement.ts).getTime();
      return {
        id: String(measurement.id),
        crewId: personId,
        metric: metricMap[measurement.indicator],
        value: Number(measurement.value),
        ...(measurement.indicator === 'bp_systolic' ? { diastolic: diastolic.get(time) } : {}),
        time,
        slot: dailyDays.has(new Date(time).toISOString().slice(0, 10))
          ? 'daily'
          : 'unscheduled',
        sessionId: checkins.find(
          (checkin) =>
            String(checkin.day).slice(0, 10) === new Date(time).toISOString().slice(0, 10),
        )?.id,
        source: measurement.source || 'Backend',
        context: 'Recorded measurement',
        operator: personId,
      };
    });
  const sessions = checkins.map((checkin) => {
    const day = String(checkin.day).slice(0, 10);
    return {
      id: String(checkin.id),
      crewId: personId,
      day,
      slot: 'daily',
      time: checkin.recorded_at ? new Date(checkin.recorded_at).getTime() : Date.parse(`${day}T00:00:00Z`),
      operator: personId,
      source: checkin.source || 'Backend',
      complete: true,
    };
  });
  const dailySessionByDay = new Map(sessions.map((session) => [session.day, session]));
  const checkinMetrics = [
    ['heart_rate', 'heart_rate', 'pulse'],
    ['blood_sugar', 'blood_sugar', 'glucose'],
    ['temperature', 'temperature', 'temp'],
    ['sleep_hours', 'sleep_hours', 'sleep'],
    ['mood', 'mood', 'mood'],
    ['fatigue', 'fatigue', 'fatigue'],
    ['exercise_min', 'exercise_min', 'exercise'],
  ];
  for (const checkin of checkins) {
    const day = String(checkin.day).slice(0, 10);
    const session = dailySessionByDay.get(day);
    const time = checkin.recorded_at ? new Date(checkin.recorded_at).getTime() : Date.parse(`${day}T00:00:00Z`);
    for (const [indicator, field, metric] of checkinMetrics) {
      const value = checkin[field];
      if (value == null) continue;
      const hasMeasurement = records.some(
        (record) =>
          record.metric === metric && new Date(record.time).toISOString().slice(0, 10) === day,
      );
      if (!hasMeasurement) {
        records.push({
          id: `checkin-${checkin.id}-${indicator}`,
          crewId: personId,
          metric,
          value: Number(value),
          time,
          slot: 'daily',
          sessionId: session?.id,
          source: checkin.source || 'Backend',
          context: 'Daily check-in',
          operator: personId,
        });
      }
    }
    const systolicRecord = records.find(
      (record) =>
        record.metric === 'bp' && new Date(record.time).toISOString().slice(0, 10) === day,
    );
    if (systolicRecord && systolicRecord.diastolic == null && checkin.bp_diastolic != null) {
      systolicRecord.diastolic = Number(checkin.bp_diastolic);
    }
    if (!systolicRecord && checkin.bp_systolic != null) {
      records.push({
        id: `checkin-${checkin.id}-bp_systolic`,
        crewId: personId,
        metric: 'bp',
        value: Number(checkin.bp_systolic),
        diastolic: checkin.bp_diastolic == null ? undefined : Number(checkin.bp_diastolic),
        time,
        slot: 'daily',
        sessionId: session?.id,
        source: checkin.source || 'Backend',
        context: 'Daily check-in',
        operator: personId,
      });
    }
  }
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
  const signals = (snapshot.active_alerts || []).map((alert) => ({
    id: `api-alert-${alert.id}`,
    ruleId: alert.rule_id,
    crewId: personId,
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
  }));
  return { personId, records, sessions, signals };
}

export function useSession({ now, profileFor, setData, setPrivateApiSignals, setDetail, notify }) {
  const [access, setAccess] = useState(LOCKED);
  const [pin, setPin] = useState(null);
  const authenticate = async (personId, code) => {
    if (!apiConfigured) throw new Error('The health API is not configured.');
    const profile = profileFor(personId);
    if (!profile) throw new Error('Crew profiles could not be loaded from the backend.');

    setApiToken('');
    setAccess(LOCKED);
    setDetail(null);
    const session = await api('/api/auth/login', {
      method: 'POST',
      auth: false,
      body: { astronaut_id: Number(profile.id), pin: code },
    });
    setApiToken(session.token);

    // MOD-05: the commander can see every crew member's private data, so their sign-in loads everyone.
    const isCommander = (session.astronaut?.role || profile.role) === 'commander';
    try {
      const own = await loadPersonData(personId, profile);
      const others = isCommander
        ? (
            await Promise.allSettled(
              crew
                .filter((person) => person.id !== personId && profileFor(person.id))
                .map((person) => loadPersonData(person.id, profileFor(person.id))),
            )
          )
            .filter((result) => result.status === 'fulfilled')
            .map((result) => result.value)
        : [];
      const loaded = [own, ...others];
      const loadedIds = new Set(loaded.map((person) => person.personId));
      setData((data) => ({
        ...data,
        operator: personId,
        records: loaded.flatMap((person) => person.records),
        sessions: [
          ...data.sessions.filter((existing) => !loadedIds.has(existing.crewId)),
          ...loaded.flatMap((person) => person.sessions),
        ],
      }));
      setPrivateApiSignals((signals) => ({
        ...signals,
        ...Object.fromEntries(loaded.map((person) => [person.personId, person.signals])),
      }));
    } catch (error) {
      setApiToken('');
      throw error;
    }

    setAccess({ all: isCommander, ids: [personId], at: Date.now() });
    setPin(null);
    const name = crew.find((person) => person.id === personId).name;
    notify(
      isCommander
        ? `${name} signed in as commander. All crew data is unlocked.`
        : `${name} signed in.`,
    );
    return { scope: isCommander ? 'all' : 'self', profile };
  };

  const requestAccess = (id, then) => {
    if (canView(access, id)) {
      setAccess((current) => ({ ...current, at: Date.now() }));
      then?.();
      return;
    }
    setPin({ personId: id, then });
  };

  const lockAll = () => {
    setAccess(LOCKED);
    setApiToken('');
    setDetail(null);
    notify('Private data locked.');
  };

  useEffect(() => {
    if (isExpired(access, now)) {
      setAccess(LOCKED);
      setApiToken('');
      setDetail(null);
      notify('Locked after 5 minutes without activity.');
    }
  }, [access, now, notify, setDetail]);

  useEffect(() => {
    if (!isUnlocked(access)) return undefined;
    const touch = () => {
      setAccess((current) => (isUnlocked(current) ? { ...current, at: Date.now() } : current));
    };
    window.addEventListener('pointerdown', touch);
    window.addEventListener('keydown', touch);
    return () => {
      window.removeEventListener('pointerdown', touch);
      window.removeEventListener('keydown', touch);
    };
  }, [access]);

  return {
    access,
    authenticate,
    can: (id) => canView(access, id),
    lockAll,
    pin,
    requestAccess,
    setPin,
  };
}
