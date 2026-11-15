import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
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
  Sun,
  ShieldHalf,
  Activity,
} from 'lucide-react';
import { dateLabel, timeLabel, number } from '../../crew/models/crewModel.js';
import { cabinSeries, cabinReference } from '../models/envData.js';
import {
  DOSE_UNIT,
  RATE_UNIT,
  eventLabel,
  locationLabel,
  sourceLabel,
} from '../models/radiation.js';
import { SignalCard } from '../../alerts/components/Signals.jsx';

const tick = { fontSize: 12, fill: '#5a6f7c' };
const DOSE_COLOR = '#2a78d6';
const EVENT_COLOR = '#eb6834';
const mSv = (v, digits = 2) => (v == null ? '—' : Number(v).toFixed(digits));
const stamp = (t) => `${dateLabel(t)} · ${timeLabel(t)} UTC`;
const TIMELINE_ICON = { solar_particle_event: Sun, shelter_period: ShieldHalf, eva: Footprints };

/** Empty / loading / error states for the radiation panels (the record comes from the API). */
function RadiationState({ status, apiConfigured }) {
  const text = !apiConfigured
    ? 'Radiation data comes from the health API. Set VITE_API_URL to show it.'
    : status === 'loading'
      ? 'Loading the radiation record…'
      : status === 'error'
        ? 'Could not load the radiation record from the health API.'
        : 'No radiation records yet. Run the backend seed to load the simulated mission record.';
  return <p className="muted rad-state">{text}</p>;
}

export default function Environment({
  onRisk,
  now,
  radiation,
  radiationStatus = 'ready',
  apiConfigured = true,
  signals = [],
}) {
  const halfHourBucket = Math.floor(now / 1800000);
  const cabin = useMemo(() => cabinSeries(halfHourBucket * 1800000), [halfHourBucket]);
  const latestCabin = cabin.at(-1);
  const range = (k) => [Math.min(...cabin.map((c) => c[k])), Math.max(...cabin.map((c) => c[k]))];
  const cabinTiles = [
    ['temp', Thermometer],
    ['pressure', Gauge],
    ['co2', Wind],
    ['humidity', Droplets],
  ];
  const rad = radiation || { empty: true };
  const daily30 = rad.empty ? [] : rad.daily.slice(-30);
  const ready = !rad.empty;
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
          <b>Simulated data — no instrument connected.</b> The radiation record is served by the
          health API and marked as simulated; cabin air is generated in the app. Magnitudes are
          illustrative. An operational version would read calibrated dosimeters and cabin sensors.
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
                Cabin dose by day
              </h2>
              <p>
                Daily dose equivalent · {DOSE_UNIT} · last {daily30.length || 30} UTC days
              </p>
            </div>
            <button className="text-link" onClick={() => onRisk('radiation')}>
              <BookOpen size={14} />
              Radiation risk · NASA
            </button>
          </div>
          {!ready ? (
            <RadiationState status={radiationStatus} apiConfigured={apiConfigured} />
          ) : (
            <>
              <div
                className="env-chart"
                role="img"
                aria-label={`Daily cabin dose over the last ${daily30.length} days. Days with a solar particle event are highlighted. Values are listed in the records table below.`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={daily30} margin={{ top: 16, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid stroke="#e3eaee" vertical={false} />
                    <XAxis
                      dataKey="time"
                      tickFormatter={dateLabel}
                      tick={tick}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={24}
                    />
                    <YAxis tick={tick} axisLine={false} tickLine={false} width={44} />
                    <Tooltip
                      labelFormatter={(t) => dateLabel(t) + ' (UTC day)'}
                      formatter={(v, _k, item) => [
                        `${mSv(v, 3)} ${DOSE_UNIT}${item.payload.spe ? ' · solar particle event' : ''}`,
                        'Cabin dose',
                      ]}
                      contentStyle={{ borderRadius: 10, border: '1px solid #dbe4ea', fontSize: 13 }}
                    />
                    <Bar dataKey="dose" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                      {daily30.map((d) => (
                        <Cell key={d.time} fill={d.spe ? EVENT_COLOR : DOSE_COLOR} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="rad-legend">
                <span>
                  <i style={{ background: DOSE_COLOR }} />
                  Background (galactic cosmic rays + trapped protons)
                </span>
                <span>
                  <i style={{ background: EVENT_COLOR }} />
                  Day with a solar particle event
                </span>
              </div>

              <h3 className="rad-subtitle">
                <Activity size={16} />
                Dose rate · last 24 h <small>{RATE_UNIT}</small>
              </h3>
              <div className="env-chart small">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rad.rates} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid stroke="#e3eaee" vertical={false} />
                    <XAxis
                      dataKey="time"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={timeLabel}
                      tick={tick}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={32}
                    />
                    <YAxis tick={tick} axisLine={false} tickLine={false} width={44} />
                    {rad.currentRate && (
                      <ReferenceLine
                        y={rad.currentRate.rateUsvH}
                        stroke="#9fb3bf"
                        strokeDasharray="4 4"
                      />
                    )}
                    <Tooltip
                      labelFormatter={(t) => timeLabel(t) + ' UTC'}
                      formatter={(v, _k, item) => [
                        `${v} ${RATE_UNIT}`,
                        item.payload.radiationType,
                      ]}
                      contentStyle={{ borderRadius: 10, border: '1px solid #dbe4ea', fontSize: 13 }}
                    />
                    <Line
                      dataKey="rateUsvH"
                      stroke={DOSE_COLOR}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <h3 className="rad-subtitle">Records</h3>
              <div className="rad-table-wrap">
                <table className="env-table rad-table">
                  <thead>
                    <tr>
                      <th>Time (UTC)</th>
                      <th>Record</th>
                      <th>Radiation type</th>
                      <th>Location</th>
                      <th>Instrument</th>
                      <th>Dose</th>
                      <th>Rate</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rad.records.map((r) => (
                      <tr key={r.id}>
                        <td>{stamp(r.time)}</td>
                        <td>{eventLabel(r.type)}</td>
                        <td>{r.radiationType}</td>
                        <td>{locationLabel(r.location)}</td>
                        <td>{r.instrument}</td>
                        <td>
                          <b>{mSv(r.doseMsv, 3)}</b> {DOSE_UNIT}
                        </td>
                        <td>
                          {r.rateUsvH == null ? '—' : number(r.rateUsvH)} {RATE_UNIT}
                        </td>
                        <td>
                          <span className="data-status">{sourceLabel(r.source)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <p className="chart-footnote">
            Doses are dose equivalent (sievert), which weights each radiation type. The CSA notes
            that neutrons account for roughly 30% of the radiation on the ISS, which is why it
            develops dedicated neutron instruments such as CANS. SOMA does not claim integration
            with CANS or any CSA instrument.
          </p>
        </section>

        <aside className="panel env-personal rad-mission">
          <div className="panel-title">
            <div>
              <h2>Mission dose</h2>
              <p>Cabin area dose since mission start</p>
            </div>
          </div>
          {!ready ? (
            <RadiationState status={radiationStatus} apiConfigured={apiConfigured} />
          ) : (
            <>
              <div className="dose-hero">
                <span>{mSv(rad.missionMsv, 1)}</span>
                <small>
                  {DOSE_UNIT} cumulative · {rad.missionDays} days
                </small>
              </div>
              <div className="dose-split">
                <div>
                  <b>
                    {rad.currentRate ? number(rad.currentRate.rateUsvH) : '—'} {RATE_UNIT}
                  </b>
                  <small>
                    Current rate
                    {rad.currentRate ? ` · ${timeLabel(rad.currentRate.time)} UTC` : ''}
                  </small>
                </div>
                <div>
                  <b>
                    {mSv(rad.last7Msv)} {DOSE_UNIT}
                  </b>
                  <small>Last 7 days</small>
                </div>
              </div>

              <h3 className="rad-subtitle">Event timeline</h3>
              {rad.timeline.length ? (
                <ol className="rad-timeline">
                  {rad.timeline.map((e) => {
                    const Icon = TIMELINE_ICON[e.type] || Radiation;
                    return (
                      <li key={e.id} className={'t-' + e.type}>
                        <span className="rad-dot" aria-hidden="true">
                          <Icon size={14} />
                        </span>
                        <div>
                          <b>{eventLabel(e.type)}</b>
                          <time>{stamp(e.time)}</time>
                          <small>
                            {locationLabel(e.location)} · {e.radiationType}
                            <br />
                            {mSv(e.doseMsv, 3)} {DOSE_UNIT}
                            {e.rateUsvH != null &&
                              ` · ${e.type === 'solar_particle_event' ? 'peak ' : ''}${number(e.rateUsvH)} ${RATE_UNIT}`}
                            {' · '}
                            {e.instrument}
                          </small>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="muted">No radiation events recorded.</p>
              )}
            </>
          )}
          <p className="station-small-print">
            <Info size={13} /> Dose is exposure, not biological harm. Long-term risk is estimated
            with models and dose history, not from a single reading.
          </p>
        </aside>
      </div>

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
