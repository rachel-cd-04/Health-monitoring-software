import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ScanLine,
  MessageSquareWarning,
  Stethoscope,
  Radio,
  ClipboardList,
  BookOpen,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  Check,
} from 'lucide-react';
import {
  crew,
  metrics,
  nextSlot,
  valueLabel,
  number,
  dateLabel,
  timeLabel,
} from '../models/crewModel.js';
import { regions, associated, regionOfMetric } from '../../health/models/health.js';
import { DailyCheck } from './HealthView.jsx';
import Anatomy, { regionIcons, regionState } from '../../health/components/Anatomy.jsx';
import { recentReports } from '../../reports/models/healthReport.js';
import { baseline } from '../../alerts/models/rules.js';
import { risks, metricRisk, metricContext } from '../../health/models/risks.js';
import RoutineChecklist from '../../routine/components/RoutineChecklist.jsx';
import { routineLaunch } from '../../routine/models/routineModel.js';

function Sparkline({ points, base }) {
  if (points.length < 2) return null;
  const W = 120,
    H = 36,
    vals = points.map((p) => p.value),
    all = base != null ? [...vals, base] : vals,
    min = Math.min(...all),
    max = Math.max(...all),
    span = max - min || 1;
  const x = (i) => (i / (points.length - 1)) * W,
    y = (v) => H - 3 - ((v - min) / span) * (H - 6);
  return (
    <svg className="sparkline" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      {base != null && <line x1="0" x2={W} y1={y(base)} y2={y(base)} className="spark-base" />}
      <polyline points={vals.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
      <circle cx={x(vals.length - 1)} cy={y(vals.at(-1))} r="3" />
    </svg>
  );
}

function IndicatorTile({ person, data, metric, signal, onHistory, now }) {
  const m = metrics[metric],
    rows = data.records
      .filter((r) => r.crewId === person.id && r.metric === metric)
      .sort((a, b) => a.time - b.time),
    last = rows.at(-1);
  const base = baseline(data.records, person.id, metric, (last?.time ?? now) + 1);
  const unit = m.unit.startsWith('/') ? m.unit : ' ' + m.unit;
  return (
    <button
      className={'indicator-tile ' + (signal ? signal.level : '')}
      onClick={() => onHistory(person.id, metric)}
      aria-label={`${m.label}: open history`}
    >
      <span className="tile-label">
        {m.label}
        <ArrowUpRight size={15} />
      </span>
      <span className="tile-value">
        {last ? valueLabel(last) : '—'}
        <small>{unit}</small>
      </span>
      <Sparkline points={rows.slice(-14)} base={base.status === 'ready' ? base.mean : null} />
      <span className={'tile-compare ' + (signal ? 'flag' : '')}>
        {signal ? (
          <>
            {(signal.delta ?? 0) < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
            {signal.short}
          </>
        ) : base.status === 'ready' ? (
          `Usual ${number(base.mean)}${unit}`
        ) : (
          'Building usual range'
        )}
      </span>
      <span className="tile-time">
        {last ? `Saved ${dateLabel(last.time)}, ${timeLabel(last.time)} UTC` : 'No saved sample'}
      </span>
    </button>
  );
}

export default function HealthProfile({
  person,
  data,
  signals = [],
  onRisk,
  onLock,
  onBack,
  onPerson,
  onMeasure,
  onReport,
  onEmergency,
  onHistory,
  onAcknowledge,
  Modal,
  backendAstronautId,
  now = Date.now(),
}) {
  const [region, setRegion] = useState(null),
    [zoom, setZoom] = useState(true);
  const reports = recentReports(data, person.id, now);
  const index = crew.findIndex((p) => p.id === person.id),
    first = person.name.split(' ')[0];
  const active = signals.filter((s) => s.level !== 'info'),
    info = signals.filter((s) => s.level === 'info');
  const affected = Object.keys(regions).filter((k) => regionState(k, signals).tone !== 'calm');
  const select = (key) => {
    setRegion(key);
    setZoom(true);
  };
  const area = regions[region];
  const regionSignals = region ? active.filter((s) => associated[region].includes(s.metric)) : [];
  const state = region ? regionState(region, signals) : null;
  const RegionIcon = region ? regionIcons[region] : null;
  const regionRisks = region
    ? [
        ...new Set(
          associated[region].flatMap((k) => [metricRisk[k], metricContext[k]]).filter(Boolean),
        ),
      ].map((id) => risks[id])
    : [];
  const station = () => onMeasure({ crewId: person.id, slot: nextSlot(data, person.id) });

  return (
    <div className="profile-page">
      <div className="profile-top">
        <button className="back-link" onClick={onBack}>
          <ArrowLeft size={18} />
          Crew
        </button>
        <div className="profile-who">
          <span className="who-avatar" style={{ '--person': person.color }}>
            {person.initials}
          </span>
          <div>
            <h1>{person.name}</h1>
            <span>{person.role}</span>
          </div>
        </div>
        <div className="person-switch">
          <button
            aria-label="Previous crew member"
            onClick={() => onPerson(crew[(index + crew.length - 1) % crew.length].id)}
          >
            <ChevronLeft size={18} />
          </button>
          <span>
            {index + 1} / {crew.length}
          </span>
          <button
            aria-label="Next crew member"
            onClick={() => onPerson(crew[(index + 1) % crew.length].id)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="profile-grid">
        <section className="stage-card" aria-label="Body map">
          <div className="stage-hint" aria-live="polite">
            {region
              ? 'Tap the area again or choose another'
              : affected.length
                ? `${affected.length} ${affected.length === 1 ? 'area needs' : 'areas need'} attention`
                : 'Tap an area of the body'}
          </div>
          <div className="stage-frame">
            <Anatomy
              uid={'profile-' + person.id}
              person={person}
              data={data}
              signals={signals}
              selected={region}
              onSelect={select}
              zoom={zoom}
            />
          </div>
          <div className="stage-tools">
            <button
              aria-label="Show the whole body"
              onClick={() => {
                setRegion(null);
                setZoom(false);
              }}
            >
              <RotateCcw size={17} />
            </button>
            <button
              aria-label={zoom ? 'Zoom out' : 'Zoom in'}
              disabled={!region}
              onClick={() => setZoom((z) => !z)}
            >
              {zoom ? <ZoomOut size={17} /> : <ZoomIn size={17} />}
            </button>
          </div>
          <div className="region-bar" role="group" aria-label="Body areas">
            {Object.entries(regions).map(([key, r]) => {
              const Icon = regionIcons[key],
                st = regionState(key, signals);
              return (
                <button
                  key={key}
                  className={(region === key ? 'active ' : '') + st.tone}
                  aria-pressed={region === key}
                  onClick={() => select(region === key ? null : key)}
                >
                  <Icon size={17} />
                  <span>{r.short}</span>
                  {st.tone !== 'calm' && <i aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="side-panel">
          <div className="panel-tabs" role="tablist">
            <button
              role="tab"
              aria-selected="true"
              className="active"
              onClick={() => setRegion(null)}
            >
              Overview{active.length > 0 && <b>{active.length}</b>}
            </button>
            <button className="tab-link" onClick={() => onHistory(person.id)}>
              History
              <ArrowUpRight size={15} />
            </button>
          </div>

          <div className="panel-body" key={region || 'overview'}>
            {region ? (
              <>
                <button className="back-link small" onClick={() => setRegion(null)}>
                  <ArrowLeft size={16} />
                  All areas
                </button>
                <div className={'region-head ' + state.tone}>
                  <span className="region-icon">
                    <RegionIcon size={22} />
                  </span>
                  <div>
                    <h2>{area.label}</h2>
                    <p>{state.line}</p>
                  </div>
                </div>
                {associated[region].length > 0 && (
                  <div className="tile-grid">
                    {associated[region].map((k) => (
                      <IndicatorTile
                        key={k}
                        metric={k}
                        person={person}
                        data={data}
                        now={now}
                        signal={regionSignals.find((s) => s.metric === k)}
                        onHistory={onHistory}
                      />
                    ))}
                  </div>
                )}
                {regionSignals.length > 0 && (
                  <div className="who-acts">
                    {regionSignals.map((s) => (
                      <p key={s.id} className={s.level}>
                        {s.level === 'review' ? <AlertTriangle size={16} /> : <Users size={16} />}
                        <span>
                          <b>
                            {s.level === 'review' ? 'Red' : 'Amber'} · who acts: {s.whoActs}
                          </b>
                          <small>{s.title}</small>
                        </span>
                      </p>
                    ))}
                  </div>
                )}
                {regionSignals.length > 0 && (
                  <details className="rule-details">
                    <summary>How this was flagged</summary>
                    {regionSignals.map((s) => (
                      <p key={s.id}>
                        <b>{s.ruleId}</b> {s.reason} Rule: {s.threshold} Illustrative threshold, not
                        a diagnosis.
                      </p>
                    ))}
                  </details>
                )}
                {regionRisks.length > 0 && (
                  <div className="region-risks">
                    <span>Why NASA tracks this</span>
                    {regionRisks.map((r) => (
                      <button key={r.id} className="text-link" onClick={() => onRisk(r.id)}>
                        <BookOpen size={15} />
                        {r.title}
                        {r.indicative
                          ? ' · indicative'
                          : metricContext.exercise === r.id
                            ? ' · indirect'
                            : ''}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <section className="panel-section">
                  <h3>Today</h3>
                  <DailyCheck
                    size="panel"
                    data={data}
                    person={person}
                    onMeasure={onMeasure}
                    onHistory={onHistory}
                    now={now}
                  />
                </section>
                <section className="panel-section">
                  <h3>Needs attention</h3>
                  {active.length + info.length === 0 ? (
                    <p className="quiet-line">
                      Nothing flagged right now. {first}’s check-ins are checked against the spec
                      rules. No flag does not confirm good health.
                    </p>
                  ) : (
                    <div className="attention-list">
                      {active.map((s) => {
                        const Icon = (s.delta ?? 0) < 0 ? TrendingDown : TrendingUp;
                        return (
                          <div key={s.id} className="attention-action-row">
                            <button
                              className={'attention-item ' + s.level}
                              onClick={() => select(regionOfMetric[s.metric])}
                            >
                              <span className="att-icon">
                                <Icon size={18} />
                              </span>
                              <span>
                                <b>{s.short}</b>
                                <small>
                                  {s.level === 'review' ? 'Red' : 'Amber'} · {s.whoActs} ·{' '}
                                  {s.compare}
                                </small>
                              </span>
                              <ChevronRight size={18} />
                            </button>
                            {s.id?.startsWith('api-alert-') && (
                              <button className="text-link" onClick={() => onAcknowledge?.(s.id)}>
                                <Check size={15} />
                                Acknowledge
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {info.map((s) => (
                        <div key={s.id} className="attention-item info">
                          <span className="att-icon">
                            <ClipboardList size={18} />
                          </span>
                          <span>
                            <b>{s.short}</b>
                            <small>{s.compare}</small>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
                {reports.length > 0 && (
                  <section className="panel-section">
                    <h3>Reported by {first}</h3>
                    <div className="report-list">
                      {reports.map((r) => {
                        const m = r.messageId && data.messages.find((x) => x.id === r.messageId);
                        return (
                          <article
                            key={r.id}
                            className={'report-item ' + r.intensity.toLowerCase()}
                          >
                            <span className="att-icon">
                              <MessageSquareWarning size={18} />
                            </span>
                            <span>
                              <b>
                                {r.what}
                                {r.where ? ` · ${r.where}` : ''}
                              </b>
                              <small>
                                {r.intensity} · started {r.since.toLowerCase()} ·{' '}
                                {dateLabel(r.createdAt)}, {timeLabel(r.createdAt)} UTC
                              </small>
                              <em>
                                {r.toCmo && (
                                  <i>
                                    <Stethoscope size={13} />
                                    Medical officer
                                  </i>
                                )}
                                {m && (
                                  <i>
                                    <Radio size={13} />
                                    {m.status === 'received'
                                      ? 'Received on Earth'
                                      : m.status === 'pending'
                                        ? 'Queued for Earth'
                                        : 'On its way to Earth'}
                                  </i>
                                )}
                              </em>
                            </span>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>

          <div className="panel-actions">
            <button className="button primary" onClick={station}>
              <ScanLine size={18} />
              Start check-in
            </button>
            <button className="button report-button" onClick={() => onReport(person.id)}>
              <MessageSquareWarning size={18} />
              Report a problem
            </button>
          </div>
        </aside>
      </div>
      {backendAstronautId && (
        <RoutineChecklist
          astronautId={backendAstronautId}
          crewId={person.id}
          environment={data.environment}
          onStart={(item, crewId) => onMeasure(routineLaunch(item, crewId))}
        />
      )}
    </div>
  );
}
