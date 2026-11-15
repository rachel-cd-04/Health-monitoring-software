import React from 'react';
import { useAppController } from './useAppController.js';
import { Activity, Radio, X, CheckCircle2 } from 'lucide-react';
import { timeLabel, missionDayNumber, environments } from '../features/crew/models/crewModel.js';
import {
  PinPad,
  SessionChip,
  ProfilePicker,
  MissionSelector,
  LockedPanel,
} from '../features/auth/components/AccessUI.jsx';
import ReportProblem from '../features/reports/components/ReportProblem.jsx';
import { RiskSheet } from '../features/alerts/components/Signals.jsx';
import Environment from '../features/environment/pages/Environment.jsx';
import AssistantDock from '../features/assistant/components/AssistantDock.jsx';
import { CrewOverview } from '../features/crew/components/HealthView.jsx';
import HealthProfile from '../features/crew/components/HealthProfile.jsx';
import {
  NotificationButton,
  NotificationCenter,
} from '../features/alerts/components/Notifications.jsx';
import { apiConfigured } from '../shared/api/apiClient.js';
import CheckInStation from '../features/checkins/components/CheckInStation.jsx';
import Modal from '../shared/components/Modal.jsx';
import AppNavigation from './AppNavigation.jsx';
import History from '../features/history/pages/History.jsx';
import Emergency, { CrewAlertBanner } from '../features/emergency/components/Emergency.jsx';
import {
  Medical,
  SettingsPanel,
  Sources,
  connectionNames,
} from '../features/support/pages/Support.jsx';
import '../styles.css';
import '../health.css';
import '../operations.css';
import '../quick-checkin.css';
import '../theme.css';
import '../dark-legacy.css';
import '../shell.css';
import '../emergency.css';

export default function App() {
  const {
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
  } = useAppController();
  if (apiStatus !== 'connected') {
    const title =
      apiStatus === 'checking' ? 'Connecting to the health service' : 'Health service unavailable';
    const message =
      apiStatus === 'missing'
        ? 'Set VITE_API_URL in the frontend environment, then reload the application.'
        : apiStatus === 'error'
          ? 'Check the backend connection and reload the application.'
          : 'Loading crew and mission data…';
    return (
      <main className="api-required" role="status">
        <h1>{title}</h1>
        <p>{message}</p>
        {apiStatus !== 'checking' && (
          <button className="button" onClick={() => window.location.reload()}>
            Reload
          </button>
        )}
      </main>
    );
  }
  return (
    <div className="app-shell">
      <AppNavigation
        view={view}
        navigate={navigate}
        data={data}
        setSettings={setSettings}
        openEmergency={openEmergency}
        detail={detail}
      />
      <header className="top">
        <div className="top-mission">
          <span className="wordmark">SOMA</span>
          <MissionSelector
            data={data}
            day={backendOverview?.mission_day || missionDayNumber(data, now)}
            onChange={setEnvironment}
          />
          <span className={'link-chip ' + data.connection}>
            <Radio size={14} />
            {data.connection === 'delayed'
              ? `Earth link · ${data.latency} min delay`
              : data.connection === 'online'
                ? apiStatus === 'connected' && backendOverview?.comms_delay_s != null
                  ? `Earth link · ${backendOverview.comms_delay_s} s delay`
                  : environments[data.environment]?.link || connectionNames.online
                : connectionNames[data.connection]}
          </span>
        </div>
        <div className="top-right">
          <span className="demo-chip">
            {apiStatus === 'connected' && health.data?.status === 'ok'
              ? 'Live API'
              : apiStatus === 'checking' || (apiConfigured && health.isPending)
                ? 'Connecting…'
                : apiStatus === 'missing'
                  ? 'API URL missing'
                  : 'API offline'}
          </span>
          <time>
            {timeLabel(now)} <small>UTC</small>
          </time>
          <div className="bell-wrap">
            <NotificationButton
              count={notif.count}
              open={reminders}
              onToggle={() => setReminders((o) => !o)}
            />
            {reminders && (
              <NotificationCenter
                canView={can}
                model={notif}
                data={data}
                onClose={() => setReminders(false)}
                onStart={(i) => {
                  setReminders(false);
                  openStation(i);
                }}
                onSnooze={snoozeReminder}
                onRestore={restoreReminder}
                onEnvironment={() => {
                  setReminders(false);
                  navigate('environment');
                }}
              />
            )}
          </div>
          <SessionChip access={access} onPick={() => setPicker(true)} onLock={lockAll} />
        </div>
      </header>
      <main className="main-content">
        <CrewAlertBanner
          data={data}
          operator={operator}
          onOpen={(id) => setEmergency({ id })}
          onResolve={(id) => {
            patchIncident(id, (a) => ({ ...a, step: 'summary' }));
            setEmergency({ id });
          }}
          onAcknowledge={acknowledge}
        />
        {view === 'crew' && !detail && (
          <CrewOverview
            now={now}
            data={data}
            signals={signals}
            access={access}
            isCommander={profileFor(access.ids[0])?.role === 'commander'}
            onRisk={setRiskSheet}
            operator={operator}
            onOpen={openPerson}
            onMeasure={openStation}
            onMedical={() => navigate('medical')}
            onHistory={openHistory}
          />
        )}
        {view === 'crew' && detail && !can(detail) && (
          <LockedPanel
            person={crew.find((c) => c.id === detail)}
            onUnlock={() => openPerson(detail)}
          />
        )}
        {view === 'crew' && detail && can(detail) && (
          <HealthProfile
            now={now}
            key={detail}
            person={crew.find((c) => c.id === detail)}
            backendAstronautId={profileFor(detail)?.id}
            data={data}
            signals={signals[detail] || []}
            onRisk={setRiskSheet}
            onBack={() => setDetail(null)}
            onPerson={openPerson}
            onMeasure={openStation}
            onLock={lockAll}
            onReport={(id) => setProblem(id)}
            onEmergency={(patient) => openEmergency(patient)}
            onHistory={openHistory}
            onAcknowledge={acknowledge}
            Modal={Modal}
          />
        )}
        {view === 'records' && (
          <History
            key={(historyPerson || 'history') + historyMetric}
            initialPerson={historyPerson}
            initialMetric={historyMetric}
            data={data}
            onMeasure={openStation}
            onRisk={setRiskSheet}
            now={now}
            canView={can}
            onUnlock={requestAccess}
          />
        )}
        {view === 'environment' && (
          <Environment onRisk={setRiskSheet} now={now} canView={can} onUnlock={requestAccess} />
        )}
        {view === 'medical' && (
          <Medical
            key={(report?.patient || operator.id) + (report?.body || '')}
            initial={report}
            data={data}
            operator={operator}
            setData={setData}
            onSend={sendReport}
            canView={can}
            onUnlock={requestAccess}
          />
        )}
        {view === 'sources' && <Sources onRisk={setRiskSheet} />}
        <footer className="main-footer">
          <span>
            <Activity size={13} />
            SOMA · Health during flight
          </span>
          <span>Independent NASA Space Apps concept · Simulated systems</span>
        </footer>
      </main>
      {station && (
        <CheckInStation
          canView={can}
          initial={station}
          operator={operator}
          data={data}
          Modal={Modal}
          onClose={() => setStation(null)}
          onSave={saveCheckIn}
        />
      )}
      {emergency && (
        <Emergency
          key={emergency.id || emergency.patient || 'new'}
          initialPatient={emergency.patient}
          incidentId={emergency.id}
          data={data}
          signals={signals}
          onPatch={patchIncident}
          operator={operator}
          onClose={() => setEmergency(null)}
          onBroadcast={broadcast}
          onAcknowledge={acknowledge}
          onUpdate={updateAssessment}
          onAppend={appendChat}
          onResolve={resolve}
          onEarth={emergencyReport}
          onError={notify}
        />
      )}
      {problem && (
        <ReportProblem
          Modal={Modal}
          person={crew.find((c) => c.id === problem)}
          connection={data.connection}
          onClose={() => setProblem(null)}
          onSubmit={submitProblem}
          onEmergency={() => {
            const p = problem;
            setProblem(null);
            openEmergency(p);
          }}
        />
      )}
      {pin && (
        <PinPad
          person={crew.find((c) => c.id === pin.personId)}
          Modal={Modal}
          onAuthenticate={authenticate}
          onClose={() => setPin(null)}
          onEmergency={() => {
            const id = pin.personId;
            setPin(null);
            openEmergency(id);
          }}
          onSuccess={(_scope, result) => {
            const { then } = pin;
            setPin(null);
            setTimeout(() => then?.(), 0);
          }}
        />
      )}
      {picker && (
        <ProfilePicker
          access={access}
          Modal={Modal}
          onClose={() => setPicker(false)}
          onChoose={(id) => {
            setPicker(false);
            openPerson(id);
          }}
        />
      )}
      {riskSheet && (
        <RiskSheet riskId={riskSheet} Modal={Modal} onClose={() => setRiskSheet(null)} />
      )}
      {settings && (
        <SettingsPanel
          a11y={a11y}
          setA11y={setA11y}
          data={data}
          onClose={() => setSettings(false)}
          Modal={Modal}
        />
      )}
      <AssistantDock
        data={data}
        personId={detail || (access.ids.length === 1 ? access.ids[0] : null)}
        canView={can}
        onAppend={appendChat}
        onStation={() => {
          const id = detail || access.ids[0];
          id && openStation({ crewId: id, slot: 'daily' });
        }}
        onEmergency={() => openEmergency(detail)}
        onRisk={setRiskSheet}
        onUnlock={(id) => requestAccess(id)}
      />
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
          <button aria-label="Dismiss notification" onClick={() => setToast('')}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
