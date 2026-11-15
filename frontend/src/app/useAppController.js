import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { crew, createEmptyState, environments } from '../features/crew/models/crewModel.js';
import { environmentSignals } from '../features/environment/models/envData.js';
import { notificationModel } from '../features/alerts/models/notificationModel.js';
import { applyA11y, readA11y } from '../features/support/models/accessibility.js';
import { apiConfigured } from '../shared/api/apiClient.js';
import { queryClient } from './queryClient.js';
import { useSession } from '../features/auth/hooks/useSession.js';
import { useCrewBootstrap } from '../features/crew/hooks/useCrewBootstrap.js';
import { crewHistoryKey, fetchCrewHistory } from '../features/crew/hooks/crewQueries.js';
import { useCreateCheckin } from '../features/checkins/hooks/useCreateCheckin.js';
import { createCheckInController } from '../features/checkins/controllers/checkInController.js';
import { useAcknowledgeAlert } from '../features/alerts/hooks/useAcknowledgeAlert.js';
import { useEmergencyController } from '../features/emergency/hooks/useEmergencyController.js';
import { useReports } from '../features/reports/hooks/useReports.js';
import { useHealth } from '../features/health/hooks/useHealth.js';

export function useAppController() {
  const [data, setData] = useState(createEmptyState),
    [view, setView] = useState('crew'),
    [detail, setDetail] = useState(null),
    [station, setStation] = useState(null),
    [emergency, setEmergency] = useState(null),
    [settings, setSettings] = useState(false),
    [reminders, setReminders] = useState(false),
    [historyMetric, setHistoryMetric] = useState('pulse'),
    [toast, setToast] = useState(''),
    [historyPerson, setHistoryPerson] = useState(null),
    [report, setReport] = useState(null),
    [now, setNow] = useState(Date.now()),
    [riskSheet, setRiskSheet] = useState(null),
    [a11y, setA11y] = useState(readA11y),
    [picker, setPicker] = useState(false),
    [problem, setProblem] = useState(null),
    [apiStatus, setApiStatus] = useState(apiConfigured ? 'checking' : 'missing'),
    [backendCrew, setBackendCrew] = useState([]),
    [backendOverview, setBackendOverview] = useState(null),
    [privateApiSignals, setPrivateApiSignals] = useState({});
  useEffect(() => {
    applyA11y(a11y);
    if (a11y.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => applyA11y(a11y);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [a11y]);
  const toastTimer = useRef();
  const backendEnvironmentApplied = useRef(false);
  const operator = crew.find((c) => c.id === data.operator) || crew[2];
  const notify = useCallback((text) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 4200);
  }, []);
  const profileFor = (id) => backendCrew.find((p) => p.frontendId === id);
  const crewBootstrap = useCrewBootstrap(apiConfigured);
  const health = useHealth(apiConfigured);
  useEffect(() => {
    if (!apiConfigured || crewBootstrap.isPending) return;
    if (crewBootstrap.isError) {
      setApiStatus('error');
      notify(`Backend unavailable: ${crewBootstrap.error.message}`);
      return;
    }
    setBackendCrew(crewBootstrap.data.crew);
    setBackendOverview(crewBootstrap.data.overview);
    if (!backendEnvironmentApplied.current) {
      const environmentId = {
        space_station: 'station',
        spacecraft_in_transit: 'transit',
      }[crewBootstrap.data.overview.environment];
      const environment = environments[environmentId];
      if (environment) {
        setData((current) => ({
          ...current,
          environment: environmentId,
          connection: environment.connection,
          latency: environment.latency,
        }));
      }
      backendEnvironmentApplied.current = true;
    }
    const today = new Date().toISOString().slice(0, 10);
    const publicSessions = crewBootstrap.data.overview.crew
      .filter((person) => person.checkin_done_today)
      .map((person) => {
        const profile = crewBootstrap.data.crew.find((item) => item.id === person.id);
        return {
          id: `backend-checkin-${person.id}-${today}`,
          crewId: profile?.frontendId,
          day: today,
          slot: 'daily',
          time: Date.parse(`${today}T00:00:00Z`),
          operator: profile?.frontendId,
          source: 'Backend',
          complete: true,
        };
      })
      .filter((session) => session.crewId);
    setData((data) => ({
      ...data,
      sessions: [
        ...data.sessions.filter(
          (session) =>
            !publicSessions.some(
              (publicSession) =>
                publicSession.crewId === session.crewId && publicSession.day === session.day,
            ),
        ),
        ...publicSessions,
      ],
    }));
    setApiStatus('connected');
  }, [
    crewBootstrap.data,
    crewBootstrap.error,
    crewBootstrap.isError,
    crewBootstrap.isPending,
    notify,
  ]);
  const { access, authenticate, can, lockAll, pin, requestAccess, setPin } = useSession({
    now,
    profileFor,
    setData,
    setPrivateApiSignals,
    setDetail,
    notify,
  });
  const setEnvironment = (id) => {
    const e = environments[id];
    setData((d) => ({ ...d, environment: id, connection: e.connection, latency: e.latency }));
    notify('Mission situation: ' + e.label);
  };
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  useEffect(() => {
    const timer = setInterval(
      () =>
        setData((old) => {
          if (old.connection === 'offline') return old;
          let changed = false;
          const now = Date.now();
          const messages = old.messages.map((m) => {
            if (m.status === 'pending') {
              changed = true;
              return {
                ...m,
                status: 'sent',
                sentAt: now,
                receiveAt: now + (old.connection === 'online' ? 1500 : old.latency * 60000),
              };
            }
            if (m.status === 'sent' && now >= m.receiveAt) {
              changed = true;
              return { ...m, status: 'received' };
            }
            return m;
          });
          return changed ? { ...old, messages } : old;
        }),
      1000,
    );
    return () => clearInterval(timer);
  }, []);
  const signals = useMemo(() => {
    if (!backendOverview?.crew) return {};
    const remote = Object.fromEntries(
      backendOverview.crew.map((p) => {
        const id = backendCrew.find((c) => Number(c.id) === Number(p.id))?.frontendId;
        const count = Number(p.active_alert_count) || 0;
        const level = p.overall === 'red' ? 'review' : p.overall === 'amber' ? 'watch' : 'info';
        const summaries = Array.from({ length: count }, (_, index) => ({
          id: `api:${p.id}:${index}`,
          level,
          short: 'Active alert',
          title: 'Alert details require an authorized profile.',
        }));
        if (p.overall === 'grey' && !summaries.length) {
          summaries.push({
            id: `api:${p.id}:no-checkin`,
            level: 'info',
            short: 'No recent check-in',
            title: 'No check-in has been recorded today.',
          });
        }
        return id ? [id, summaries] : [];
      }),
    );
    for (const id of access.ids) remote[id] = privateApiSignals[id] || [];
    return remote;
  }, [backendOverview, backendCrew, privateApiSignals, access.ids]);
  const notif = notificationModel(data, now, signals, environmentSignals(now));
  const snoozeReminder = (id) => {
    setData((d) => ({
      ...d,
      reminderSnoozes: { ...d.reminderSnoozes, [id]: Date.now() + 15 * 60000 },
    }));
    notify('Reminder snoozed for 15 minutes.');
  };
  const restoreReminder = (id) =>
    setData((d) => {
      const next = { ...d.reminderSnoozes };
      delete next[id];
      return { ...d, reminderSnoozes: next };
    });
  const openHistory = (id, metric = 'pulse') =>
    requestAccess(id, async () => {
      try {
        const profile = profileFor(id);
        if (profile) {
          const map = {
            heart_rate: 'pulse',
            bp_systolic: 'bp',
            blood_sugar: 'glucose',
            temperature: 'temp',
            sleep_hours: 'sleep',
            mood: 'mood',
            fatigue: 'fatigue',
            exercise_min: 'exercise',
          };
          const indicators = [...Object.keys(map), 'bp_diastolic'];
          const histories = await Promise.all(
            indicators.map((indicator) =>
              queryClient.fetchQuery({
                queryKey: crewHistoryKey(profile.id, indicator, 180),
                queryFn: () => fetchCrewHistory(profile.id, indicator, 180),
              }),
            ),
          );
          const diastolic = new Map(
            (histories.at(-1).points || []).map((point) => [
              new Date(point.ts).getTime(),
              Number(point.value),
            ]),
          );
          const records = histories.slice(0, -1).flatMap((history, index) =>
            (history.points || []).map((point, n) => {
              const time = new Date(point.ts).getTime();
              return {
                id: `history-${indicators[index]}-${n}`,
                crewId: id,
                metric: map[indicators[index]],
                value: Number(point.value),
                ...(indicators[index] === 'bp_systolic' ? { diastolic: diastolic.get(time) } : {}),
                time,
                slot: data.sessions.some(
                  (session) =>
                    session.crewId === id &&
                    session.day === new Date(time).toISOString().slice(0, 10),
                )
                  ? 'daily'
                  : 'unscheduled',
                source: point.source || 'Backend',
                context: 'Health API history',
                operator: id,
              };
            }),
          );
          setData((d) => ({
            ...d,
            records: [...d.records.filter((r) => r.crewId !== id), ...records],
          }));
        }
      } catch (error) {
        notify(`Could not load history: ${error.message}`);
      }
      setHistoryPerson(id);
      setHistoryMetric(metric);
      setView('records');
      setDetail(null);
    });
  const navigate = (id) => {
    setView(id);
    setDetail(null);
  };
  const openPerson = (id) =>
    requestAccess(id, () => {
      setDetail(id);
      setView('crew');
    });
  const openStation = (initial) => requestAccess(initial.crewId, () => setStation(initial));
  const checkinMutation = useCreateCheckin();
  const acknowledgeAlertMutation = useAcknowledgeAlert();
  const saveCheckIn = createCheckInController({
    profileFor,
    setData,
    setPrivateApiSignals,
    notify,
    crew,
    persistCheckIn: checkinMutation.mutateAsync,
  });
  const appendChat = (key, message) =>
    setData((d) => ({
      ...d,
      chatThreads: { ...d.chatThreads, [key]: [...(d.chatThreads[key] || []), message] },
    }));
  const { broadcast, acknowledge, patchIncident, updateAssessment, resolve, emergencyReport } =
    useEmergencyController({
      apiConfigured,
      acknowledgeAlert: acknowledgeAlertMutation.mutateAsync,
      crew,
      data,
      operator,
      profileFor,
      setData,
      setEmergency,
      setPrivateApiSignals,
      setReport,
      notify,
      navigate,
    });
  const activeEmergency = data.crewAlerts.find((a) => a.status === 'active');
  const openEmergency = (patient) =>
    setEmergency(activeEmergency ? { id: activeEmergency.id } : { patient });
  const { sendReport, submitProblem } = useReports({
    data,
    problem,
    setData,
    setProblem,
    notify,
    crew,
  });

  return {
    access,
    acknowledge,
    activeEmergency,
    a11y,
    authenticate,
    apiStatus,
    backendOverview,
    broadcast,
    can,
    crew,
    data,
    detail,
    emergency,
    emergencyReport,
    health,
    historyMetric,
    historyPerson,
    lockAll,
    navigate,
    now,
    notify,
    openEmergency,
    openHistory,
    openPerson,
    openStation,
    operator,
    profileFor,
    patchIncident,
    picker,
    pin,
    problem,
    report,
    reminders,
    requestAccess,
    resolve,
    restoreReminder,
    riskSheet,
    saveCheckIn,
    sendReport,
    setA11y,
    setData,
    setDetail,
    setEmergency,
    setHistoryMetric,
    setHistoryPerson,
    setPicker,
    setPin,
    setProblem,
    setReminders,
    setReport,
    setRiskSheet,
    setSettings,
    setStation,
    setToast,
    setView,
    setEnvironment,
    settings,
    signals,
    station,
    submitProblem,
    toast,
    updateAssessment,
    view,
    appendChat,
    notif,
    snoozeReminder,
  };
}
