import React, { useMemo, useState } from 'react';
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

export default function History({
  data,
  initialPerson,
  initialMetric,
  onMeasure,
  onRisk,
  now = Date.now(),
  canView = () => true,
  onUnlock,
}) {
  const [who, setWho] = useState(initialPerson || (crew.find((c) => canView(c.id)) || crew[0]).id),
    [metric, setMetric] = useState(initialMetric || 'pulse'),
    [days, setDays] = useState(7),
    [slot, setSlot] = useState('all'),
    [page, setPage] = useState(0);
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
  const base = useMemo(
    () => personalBaseline(data.records, who, metric, now + 1),
    [data.records, who, metric, now],
  );
  const metricSignals = useMemo(
    () => evaluateSignals(data, who, now).filter((s) => s.metric === metric),
    [data, who, metric, now],
  );
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
            {[1, 3, 7, 30].map((d) => (
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
              baseline={base.status === 'ready' ? base.mean : null}
              key={`${who}-${metric}-${slot}-${days}`}
              records={data.records}
              crewId={who}
              metric={metric}
              days={days}
              slot={slot}
              large
            />
            <p className="chart-footnote">
              Each dot is a saved measurement. Lines connect recorded samples. They do not represent
              continuous monitoring. The dashed line is the mean of the person’s last 7 days.
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
