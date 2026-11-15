import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Radiation,
  Thermometer,
  Gauge,
  Wind,
  Droplets,
  Database,
  BookOpen,
  Footprints,
  Info,
} from 'lucide-react';
import { crew, dateLabel, timeLabel, number, DAY_MS } from '../../crew/models/crewModel.js';
import {
  locations,
  doseHistory,
  personalDose,
  evaLog,
  cabinSeries,
  cabinReference,
  environmentSignals,
  DOSE_UNIT,
} from '../models/envData.js';
import { SignalCard } from '../../alerts/components/Signals.jsx';
import { LockedPanel } from '../../auth/components/AccessUI.jsx';
import { apiConfigured } from '../../../shared/api/apiClient.js';
import { useRadiationEvents } from '../hooks/useRadiationEvents.js';

// Categorical order validated with the dataviz palette script (light surface). Contrast relief: table view below.
const series = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'];
const tick = { fontSize: 12, fill: '#5a6f7c' };

export default function Environment({ onRisk, now, canView = () => true, onUnlock }) {
  const radiationEvents = useRadiationEvents(apiConfigured);
  const [person, setPerson] = useState(crew[0].id);
  const dayBucket = Math.floor(now / DAY_MS);
  const halfHourBucket = Math.floor(now / 1800000);
  const rows = useMemo(() => doseHistory(dayBucket * DAY_MS, 7), [dayBucket]);
  const cabin = useMemo(() => cabinSeries(halfHourBucket * 1800000), [halfHourBucket]);
  const signals = useMemo(() => environmentSignals(dayBucket * DAY_MS), [dayBucket]);
  const latestCabin = cabin.at(-1);
  const dose = personalDose(person, now);
  const evas = evaLog.filter((e) => e.crewId === person);
  const range = (k) => [Math.min(...cabin.map((c) => c[k])), Math.max(...cabin.map((c) => c[k]))];
  const total = (id) => rows.reduce((s, r) => s + r[id], 0);
  const cabinTiles = [
    ['temp', Thermometer],
    ['pressure', Gauge],
    ['co2', Wind],
    ['humidity', Droplets],
  ];
  return (
    <section className="environment-view">
      <div className="overview-heading">
        <div>
          <div className="section-kicker">
            Mission environment · Space radiation & closed habitat
          </div>
          <h1>Environment</h1>
          <p>Radiation dose and cabin air. Exposure is context, not a health verdict.</p>
        </div>
      </div>
      <div className="synthetic-banner" role="note">
        <Database size={18} />
        <div>
          <b>Synthetic data — no instrument connected.</b> Values are generated for this
          demonstration and their magnitudes are illustrative. An operational version would read
          calibrated dosimeters and cabin sensors.
        </div>
      </div>

      {signals.length > 0 && (
        <div className="env-signals">
          {signals.map((s) => (
            <SignalCard key={s.id} signal={s} onRisk={onRisk} compact />
          ))}
        </div>
      )}

      <div className="env-grid">
        <section className="panel env-dose">
          <div className="panel-title">
            <div>
              <h2>
                <Radiation size={18} />
                Absorbed dose by location
              </h2>
              <p>Daily totals · {DOSE_UNIT} · last 7 UTC days</p>
            </div>
            <button className="text-link" onClick={() => onRisk('radiation')}>
              <BookOpen size={14} />
              Radiation risk · NASA
            </button>
          </div>
          <div
            className="env-chart"
            role="img"
            aria-label="Daily absorbed dose for five locations over seven days. A simulated solar particle event raises dose two days ago. Values are listed in the table below."
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 24, right: 24, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="#e3eaee" vertical={false} />
                <XAxis
                  dataKey="time"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  ticks={rows.map((r) => r.time)}
                  tickFormatter={dateLabel}
                  tick={tick}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={tick} axisLine={false} tickLine={false} width={52} />
                {rows
                  .filter((r) => r.event)
                  .map((r) => (
                    <ReferenceLine
                      key={r.time}
                      x={r.time}
                      stroke="#8a5a12"
                      strokeDasharray="4 4"
                      label={{
                        value: 'Simulated solar event',
                        position: 'top',
                        fill: '#7a4f10',
                        fontSize: 12,
                      }}
                    />
                  ))}
                <Tooltip
                  labelFormatter={(t) => dateLabel(t) + ' (UTC day)'}
                  formatter={(v, k) => [
                    `${v} ${DOSE_UNIT}`,
                    locations.find((l) => l.id === k)?.name,
                  ]}
                  contentStyle={{ borderRadius: 10, border: '1px solid #dbe4ea', fontSize: 13 }}
                />
                {locations.map((l, i) => (
                  <Line
                    key={l.id}
                    dataKey={l.id}
                    name={l.name}
                    stroke={series[i]}
                    strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                    activeDot={{ r: 6 }}
                    isAnimationActive={false}
                  />
                ))}
                <Legend
                  iconType="plainline"
                  wrapperStyle={{ fontSize: 13, paddingTop: 8 }}
                  formatter={(v) => <span style={{ color: 'var(--ink-2)' }}>{v}</span>}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <table className="env-table">
            <thead>
              <tr>
                <th>Location</th>
                <th>Instrument</th>
                <th>Today</th>
                <th>7-day total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((l, i) => {
                const today = rows.at(-1)[l.id];
                return (
                  <tr key={l.id}>
                    <td>
                      <span className="series-key" style={{ '--c': series[i] }} />
                      {l.name}
                    </td>
                    <td>{l.instrument}</td>
                    <td>
                      <b>{today}</b> {DOSE_UNIT}
                    </td>
                    <td>{number(total(l.id) / 1000)} mGy</td>
                    <td>
                      <span className="data-status">Synthetic</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="chart-footnote">
            The CSA notes that neutrons account for roughly 30% of the radiation on the ISS, which
            is why it develops dedicated neutron instruments such as CANS. SOMA does not claim
            integration with CANS or any CSA instrument.
          </p>
        </section>

        <aside className="panel env-personal">
          <div className="panel-title">
            <div>
              <h2>Personal dose</h2>
              <p>Cabin share + EVA badge · 7 days</p>
            </div>
          </div>
          <label>
            Crew member
            <select value={person} onChange={(e) => setPerson(e.target.value)}>
              {crew.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {canView(c.id) ? '' : ' · locked'}
                </option>
              ))}
            </select>
          </label>
          {!canView(person) ? (
            <LockedPanel
              compact
              person={crew.find((c) => c.id === person)}
              what="personal dose"
              onUnlock={() => onUnlock(person)}
            />
          ) : (
            <>
              <div className="dose-hero">
                <span>{number(dose.total / 1000)}</span>
                <small>mGy absorbed · 7 days</small>
              </div>
              <div className="dose-split">
                <div>
                  <b>{number(dose.cabin / 1000)} mGy</b>
                  <small>Inside the vehicle</small>
                </div>
                <div>
                  <b>{number(dose.eva / 1000)} mGy</b>
                  <small>During EVA</small>
                </div>
              </div>
              {evas.length ? (
                evas.map((e) => (
                  <div className="eva-note" key={e.daysAgo}>
                    <Footprints size={16} />
                    <span>
                      <b>
                        EVA · {dateLabel(now - e.daysAgo * 86400000)} · {e.hours} h
                      </b>
                      {e.note}
                    </span>
                  </div>
                ))
              ) : (
                <p className="muted">No EVA recorded in this period.</p>
              )}
            </>
          )}
          <p className="station-small-print">
            <Info size={13} /> Dose is exposure, not biological harm. Long-term risk is estimated
            with models and dose history, not from a single reading.
          </p>
        </aside>
      </div>

      {apiConfigured && (
        <section className="panel env-event-log">
          <div className="panel-title">
            <div>
              <h2>Backend radiation event log</h2>
              <p>Persisted mission events from the radiation API</p>
            </div>
          </div>
          {radiationEvents.isPending ? (
            <p className="muted">Loading radiation events…</p>
          ) : radiationEvents.error ? (
            <p className="banner warning">
              Could not load radiation events: {radiationEvents.error.message}
            </p>
          ) : radiationEvents.data.length ? (
            <div className="records-table">
              <table>
                <thead>
                  <tr>
                    <th>Time (UTC)</th>
                    <th>Location</th>
                    <th>Radiation</th>
                    <th>Dose</th>
                    <th>Dose rate</th>
                    <th>Type</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {radiationEvents.data.map((event) => (
                    <tr key={event.id}>
                      <td>{new Date(event.ts).toLocaleString([], { timeZone: 'UTC' })} UTC</td>
                      <td>{event.location || 'Not recorded'}</td>
                      <td>{event.radiation_type || 'Not recorded'}</td>
                      <td>{event.dose_msv == null ? '—' : `${event.dose_msv} mSv`}</td>
                      <td>
                        {event.dose_rate_usv_h == null ? '—' : `${event.dose_rate_usv_h} µSv/h`}
                      </td>
                      <td>{event.event_type || '—'}</td>
                      <td>{event.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="routine-message">
              No radiation events are stored in the backend. The chart above is simulated frontend
              data.
            </p>
          )}
        </section>
      )}

      <section className="panel env-cabin">
        <div className="panel-title">
          <div>
            <h2>Cabin atmosphere</h2>
            <p>Last 24 h · 30-minute samples · latest at {timeLabel(latestCabin.time)} UTC</p>
          </div>
          <button className="text-link" onClick={() => onRisk('habitat')}>
            <BookOpen size={14} />
            Closed environments · NASA
          </button>
        </div>
        <div className="cabin-tiles">
          {cabinTiles.map(([k, Icon]) => {
            const ref = cabinReference[k],
              [lo, hi] = range(k),
              over = ref.demoLimit && hi >= ref.demoLimit;
            return (
              <div key={k} className={'cabin-tile ' + (over ? 'watch' : '')}>
                <span>
                  <Icon size={16} />
                  {ref.label}
                </span>
                <b>
                  {number(latestCabin[k])}
                  <small>{ref.unit}</small>
                </b>
                <em>
                  24 h range {number(lo)}–{number(hi)} {ref.unit}
                </em>
                {ref.demoLimit && (
                  <em className="ref">
                    Demo reference {ref.demoLimit} {ref.unit}
                  </em>
                )}
              </div>
            );
          })}
        </div>
        <div
          className="env-chart small"
          role="img"
          aria-label={`ppCO2 over the last 24 hours with the demonstration reference at ${cabinReference.co2.demoLimit} millimetres of mercury.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cabin} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#e3eaee" vertical={false} />
              <XAxis
                dataKey="time"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={timeLabel}
                minTickGap={60}
                tick={tick}
                axisLine={false}
                tickLine={false}
              />
              <YAxis domain={[2, 5]} tick={tick} axisLine={false} tickLine={false} width={52} />
              <ReferenceLine
                y={cabinReference.co2.demoLimit}
                stroke="#8a5a12"
                strokeDasharray="4 4"
                label={{
                  value: 'Demo reference',
                  position: 'insideTopRight',
                  fill: '#7a4f10',
                  fontSize: 12,
                }}
              />
              <Tooltip
                labelFormatter={(t) => timeLabel(t) + ' UTC'}
                formatter={(v) => [`${v} mmHg`, 'ppCO₂']}
                contentStyle={{ borderRadius: 10, border: '1px solid #dbe4ea', fontSize: 13 }}
              />
              <Line
                dataKey="co2"
                name="ppCO₂"
                stroke="#2a78d6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="chart-footnote">
          ppCO₂ (mmHg) · The reference line is a demonstration value, not a flight rule.
        </p>
      </section>
    </section>
  );
}
