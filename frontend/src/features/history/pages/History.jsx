import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, ClipboardList, BookOpen, CalendarCheck } from 'lucide-react';
import { baseline as personalBaseline, evaluateSignals } from '../../alerts/models/rules.js';
import { riskFor } from '../../health/models/risks.js';
import { SignalCard } from '../../alerts/components/Signals.jsx';
import { LockedPanel } from '../../auth/components/AccessUI.jsx';
import {
  crew,
  metrics,
  metricOrder,
  stamp,
  number,
  valueLabel,
  downloadFile,
  slotNames,
} from '../../crew/models/crewModel.js';
import SampleChart from '../components/Charts.jsx';
import { crewHistoryKey, fetchCrewHistory } from '../../crew/hooks/crewQueries.js';
import { missionHistoryEvents } from '../../environment/models/envData.js';

const apiIndicatorByMetric = {
  pulse: 'heart_rate',
  bp: 'bp_systolic',
  glucose: 'blood_sugar',
  temp: 'temperature',
  sleep: 'sleep_hours',
  mood: 'mood',
  fatigue: 'fatigue',
  exercise: 'exercise_min',
};

export default function History({
  data,
  initialPerson,
  initialMetric,
  onMeasure,
  onRisk,
  now = Date.now(),
  canView = () => true,
  onUnlock,
  profileFor,
}) {
  const [who, setWho] = useState(initialPerson || (crew.find((c) => canView(c.id)) || crew[0]).id),
    [metric, setMetric] = useState(initialMetric || 'pulse'),
    [days, setDays] = useState(7),
    [slot, setSlot] = useState('all'),
    [page, setPage] = useState(0);
  const backendProfile = profileFor?.(who);
  const backendHistory = useQuery({
    queryKey: crewHistoryKey(backendProfile?.id, apiIndicatorByMetric[metric], 180),
    queryFn: () => fetchCrewHistory(backendProfile.id, apiIndicatorByMetric[metric], 180),
    enabled: Boolean(backendProfile?.id) && canView(who),
    staleTime: 60_000,
  });
  const rows = useMemo(
    () =>
      data.records
        .filter(
          (r) =>
            r.crewId === who &&
            r.metric === metric &&
            r.time >= Date.now() - days * 86400000 &&
            (slot === 'all' ||
              (slot === 'daily'
                ? ['daily', 'morning', 'evening'].includes(r.slot)
                : r.slot === slot)),
        )
        .sort((a, b) => b.time - a.time),
    [data.records, who, metric, days, slot],
  );
  const latestRow = rows[0];
  const excludedLatest = useMemo(() => (latestRow ? [latestRow.id] : []), [latestRow]);
  const base = useMemo(
    () => personalBaseline(data.records, who, metric, now + 1, excludedLatest),
    [data.records, who, metric, now, excludedLatest],
  );
  const diastolicBase = useMemo(() => {
    if (metric !== 'bp') return null;
    const diastolicRecords = data.records.map((record) =>
      record.metric === 'bp' ? { ...record, value: record.diastolic } : record,
    );
    return personalBaseline(diastolicRecords, who, 'bp', now + 1, excludedLatest);
  }, [data.records, who, metric, now, excludedLatest]);
  const metricSignals = useMemo(
    () => evaluateSignals(data, who, now).filter((s) => s.metric === metric),
    [data, who, metric, now],
  );
  const chartAlerts =
    backendHistory.data?.alert_markers?.length > 0
      ? backendHistory.data.alert_markers
      : metricSignals.map((signal) => ({
          id: signal.id,
          ts: signal.observed?.time,
          value: signal.observed?.value,
          rule_id: signal.ruleId,
        }));
  const chartEvents = useMemo(
    () => [
      ...(backendHistory.data?.events || []),
      ...missionHistoryEvents(who, now, Math.min(days, 180)),
    ],
    [backendHistory.data?.events, who, now, days],
  );
  const deltaText = (() => {
    if (!latestRow || base.status !== 'ready') return null;
    const delta = latestRow.value - base.mean;
    const direction = delta > 0 ? 'above' : delta < 0 ? 'below' : 'at';
    if (metric !== 'bp') {
      return `Latest ${number(latestRow.value)} ${metrics[metric].unit} · ${number(Math.abs(delta))} ${metrics[metric].unit} ${direction} personal mean`;
    }
    const diastolicDelta =
      latestRow.diastolic != null && diastolicBase?.status === 'ready'
        ? latestRow.diastolic - diastolicBase.mean
        : null;
    const sysText =
      delta === 0
        ? `Systolic at personal mean`
        : `Systolic ${delta > 0 ? '+' : '−'}${number(Math.abs(delta))} mmHg vs mean`;
    const diaText =
      diastolicDelta == null
        ? ''
        : diastolicDelta === 0
          ? ' · Diastolic at mean'
          : ` · Diastolic ${diastolicDelta > 0 ? '+' : '−'}${number(Math.abs(diastolicDelta))} mmHg vs mean`;
    return `${sysText}${diaText}`;
  })();
  const risk = riskFor(metric);
  const change = (setter) => (e) => {
    setter(e.target.value);
    setPage(0);
  };
  const exportCSV = () => {
    const cell = (x) => '"' + String(x ?? '').replaceAll('"', '""') + '"';
    const columns = [
      'Crew member',
      'Metric',
      'Value',
      'Diastolic',
      'Unit',
      'Recorded at UTC',
      'Check-in',
      'Source',
      'Protocol checked',
      'Notes',
    ];
    const body = rows.map((r) => [
      crew.find((c) => c.id === who).name,
      metrics[metric].label,
      r.value,
      r.diastolic,
      metrics[metric].unit,
      new Date(r.time).toISOString(),
      slotNames[r.slot] || r.slot,
      r.source,
      r.protocol?.pre && r.protocol?.quality ? 'Yes' : 'Not available',
      r.note,
    ]);
    downloadFile(
      'SOMA-samples.csv',
      '\uFEFF' + [columns, ...body].map((r) => r.map(cell).join(',')).join('\r\n'),
      'text/csv;charset=utf-8',
    );
  };
  return (
    <section className="history-view">
      <div className="overview-heading">
        <div>
          <div className="section-kicker">Measurement history</div>
          <h1>History</h1>
          <p>
            Every saved sample with its time and source, compared with the person’s usual range.
          </p>
        </div>
        <button className="button subtle" onClick={exportCSV}>
          <Download size={17} />
          Export samples
        </button>
      </div>
      <div className="history-filters">
        <label>
          Crew member
          <select value={who} onChange={change(setWho)}>
            {crew.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {canView(c.id) ? '' : ' · locked'}
              </option>
            ))}
          </select>
        </label>
        <label>
          Indicator
          <select value={metric} onChange={change(setMetric)}>
            {metricOrder.map((k) => (
              <option key={k} value={k}>
                {metrics[k].label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Check-in
          <select value={slot} onChange={change(setSlot)}>
            <option value="all">All samples</option>
            <option value="daily">Daily check-ins</option>
            <option value="unscheduled">Additional assessments</option>
          </select>
        </label>
        <label>
          Period
          <select
            value={days}
            onChange={(e) => {
              setDays(Number(e.target.value));
              setPage(0);
            }}
          >
            {[1, 3, 7, 30, 90, 180].map((d) => (
              <option key={d} value={d}>
                {d} {d === 1 ? 'day' : 'days'}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!canView(who) ? (
        <LockedPanel
          person={crew.find((c) => c.id === who)}
          what="history"
          onUnlock={() => onUnlock(who)}
        />
      ) : (
        <>
          <div className="history-graph panel">
            <div className="history-graph-title">
              <div>
                <h2>{metrics[metric].label}</h2>
                <p>
                  {crew.find((c) => c.id === who).name} · {rows.length} saved{' '}
                  {rows.length === 1 ? 'sample' : 'samples'} · {metrics[metric].unit}
                </p>
              </div>
              <div className="graph-actions">
                <span className="baseline-chip">
                  {base.status === 'ready' ? (
                    <>
                      Personal baseline{' '}
                      <b>
                        {number(base.mean)} {metrics[metric].unit}
                      </b>{' '}
                      · {base.n} samples
                    </>
                  ) : (
                    <>Baseline building · {base.n}/4 samples</>
                  )}
                </span>
                {deltaText && (
                  <span
                    className="trend-delta-chip"
                    title="Newest selected reading compared with the current 7-day personal mean"
                  >
                    {deltaText}
                  </span>
                )}
                <button className="text-link" onClick={() => onRisk(risk.id)}>
                  <BookOpen size={14} />
                  {risk.org} · {risk.title}
                </button>
              </div>
            </div>
            {metricSignals.map((sg) => (
              <SignalCard key={sg.id} signal={sg} onRisk={onRisk} compact />
            ))}
            <SampleChart
              baseline={
                base.status === 'ready'
                  ? { mean: base.mean, low: base.mean - base.sd, high: base.mean + base.sd }
                  : null
              }
              diastolicBaseline={
                diastolicBase?.status === 'ready'
                  ? {
                      mean: diastolicBase.mean,
                      low: diastolicBase.mean - diastolicBase.sd,
                      high: diastolicBase.mean + diastolicBase.sd,
                    }
                  : null
              }
              alertMarkers={chartAlerts}
              events={chartEvents}
              key={`${who}-${metric}-${slot}-${days}`}
              records={data.records}
              crewId={who}
              metric={metric}
              days={days}
              slot={slot}
              large
            />
            <p className="chart-footnote">
              Each dot is a saved measurement; lines connect recorded samples and do not represent
              continuous monitoring. The shaded band shows the current 7-day personal mean ± 1
              standard deviation. Red markers show alert rules; vertical amber lines show simulated
              mission events. These markers provide context and do not prove cause and effect.
            </p>
          </div>
          <div className="panel records-table">
            <table>
              <thead>
                <tr>
                  <th>Check-in</th>
                  <th>Recorded at (UTC)</th>
                  <th>Value</th>
                  <th>Source</th>
                  <th>Verification</th>
                  <th>Context / notes</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(page * 8, page * 8 + 8).map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="slot-label">
                        {r.slot === 'unscheduled' ? (
                          <ClipboardList size={13} />
                        ) : (
                          <CalendarCheck size={13} />
                        )}{' '}
                        {slotNames[r.slot] || 'Additional'}
                      </span>
                    </td>
                    <td>{stamp(r.time)}</td>
                    <td>
                      <strong>{valueLabel(r)}</strong> {metrics[metric].unit}
                    </td>
                    <td>{r.source}</td>
                    <td>
                      {r.protocol?.pre && r.protocol?.quality
                        ? r.protocol.confirmationMode === 'shared'
                          ? 'Setup & readings confirmed'
                          : 'Checklist confirmed'
                        : 'Previous entry'}
                    </td>
                    <td>
                      {r.context}
                      <small>{r.note || 'No additional note'}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && (
              <div className="empty-state">
                <p>No samples to display.</p>
              </div>
            )}
            <div className="table-footer">
              <span>{rows.length} matching samples</span>
              <div>
                <button
                  className="button subtle"
                  disabled={!page}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span>
                  {page + 1} / {Math.max(1, Math.ceil(rows.length / 8))}
                </span>
                <button
                  className="button subtle"
                  disabled={(page + 1) * 8 >= rows.length}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
