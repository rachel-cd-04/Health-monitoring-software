import React from 'react';
import {
  Check,
  ScanLine,
  Clock,
  CalendarCheck,
  TrendingUp,
  TrendingDown,
  CircleDot,
  ArrowUpRight,
  Lock,
  LockOpen,
} from 'lucide-react';
import { canView, generalStatus } from '../../auth/models/access.js';
import { crew, checkIn, slotStatus, timeLabel } from '../models/crewModel.js';
import Anatomy from '../../health/components/Anatomy.jsx';
import CommanderAlerts from './CommanderAlerts.jsx';

/** One check-in per person and day: done, due or scheduled. */
export function DailyCheck({
  data,
  person,
  onMeasure,
  onHistory,
  now = Date.now(),
  size = 'card',
}) {
  const done = checkIn(data, person.id, 'daily'),
    state = slotStatus(data, person.id, 'daily', now);
  const go = (e) => {
    e.stopPropagation();
    done ? onHistory?.(person.id) : onMeasure({ crewId: person.id, slot: 'daily' });
  };
  return (
    <button
      className={'daily-check ' + state + ' ' + size}
      onClick={go}
      aria-label={`Daily check-in for ${person.name}: ${done ? 'done' : state}`}
    >
      <span className="daily-icon">
        {done ? (
          <Check size={18} strokeWidth={2.6} />
        ) : state === 'due' ? (
          <Clock size={18} />
        ) : (
          <CalendarCheck size={18} />
        )}
      </span>
      <span className="daily-text">
        <b>{done ? 'Checked in today' : state === 'due' ? 'Check-in due' : 'Check-in scheduled'}</b>
        <small>
          {done
            ? `${timeLabel(done.time)} UTC`
            : state === 'due'
              ? `Since ${data.schedule.daily} UTC`
              : `${data.schedule.daily} UTC`}
        </small>
      </span>
      {!done && <span className="daily-cta">{state === 'due' ? 'Start' : 'Open'}</span>}
    </button>
  );
}
// Kept for callers that still import the old name.
export const RoutineStatus = (props) => <DailyCheck {...props} />;

export function personIssues(data, person, signals) {
  const out = [];
  if (data.crewAlerts.some((a) => a.patient === person.id && a.status === 'active'))
    out.push({
      key: 'alert',
      tone: 'alert',
      label: 'Assistance requested',
      title: 'Crew assistance requested',
      icon: <CircleDot size={14} />,
    });
  for (const s of signals.filter((x) => x.level !== 'info'))
    out.push({
      key: s.id,
      tone: s.level === 'review' ? 'review' : 'signal',
      label: s.short,
      title: s.title,
      signal: s,
      icon: (s.delta ?? 0) < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />,
    });
  return out;
}
// Backwards-compatible single-line summary.
export function personHeadline(data, person, signals) {
  const i = personIssues(data, person, signals);
  return i.length
    ? { tone: i[0].tone, text: i.map((x) => x.label).join(' · ') }
    : { tone: 'calm', text: 'Nothing reported' };
}

export function CrewOverview({
  data,
  signals = {},
  access,
  onOpen,
  onMeasure,
  onHistory,
  now,
  isCommander = false,
}) {
  const done = crew.filter((p) => checkIn(data, p.id, 'daily')).length;
  const status = Object.fromEntries(
    crew.map((p) => [
      p.id,
      generalStatus(
        signals[p.id] || [],
        data.crewAlerts.some((a) => a.patient === p.id && a.status === 'active'),
      ),
    ]),
  );
  const attention = crew.filter((p) => status[p.id].count > 0).length;
  return (
    <div className="crew-page">
      <header className="page-head">
        <div>
          <h1>Crew health</h1>
          <p>
            {done} of {crew.length} daily check-ins done
            {attention ? (
              <>
                .{' '}
                <span className="head-flag">
                  {attention} {attention === 1 ? 'person has' : 'people have'} items to review.
                </span>
              </>
            ) : (
              '.'
            )}
          </p>
        </div>
        <button
          className="button primary"
          onClick={() => onMeasure()}
        >
          <ScanLine size={18} />
          Start a check-in
        </button>
      </header>
      <section className="crew-grid" aria-label="Crew">
        {crew.map((person) => {
          const sig = signals[person.id] || [],
            open = canView(access, person.id),
            st = status[person.id],
            issues = open ? personIssues(data, person, sig) : [];
          const lightText =
            st.light === 'red'
              ? 'Assistance requested'
              : st.count
                ? `${st.count} ${st.count === 1 ? 'item' : 'items'} to review`
                : st.light === 'grey'
                  ? 'No recent check-in'
                  : 'Nothing flagged';
          return (
            <article key={person.id} className={'crew-card light-' + st.light}>
              <button
                className="crew-card-hit"
                onClick={() => onOpen(person.id)}
                aria-label={`Open ${person.name}${open ? '' : ' (code required)'}`}
              />
              <div className="crew-card-top">
                <div>
                  <h2>{person.name}</h2>
                  <span>{person.role}</span>
                </div>
                <span
                  className={'card-lock' + (open ? ' open' : '')}
                  title={open ? 'Private data unlocked' : 'Private data locked'}
                >
                  {open ? <LockOpen size={17} /> : <Lock size={17} />}
                </span>
              </div>
              <div className="crew-card-body">
                <Anatomy
                  uid={'crew-' + person.id}
                  compact
                  data={data}
                  person={person}
                  signals={open ? sig : []}
                  hideDots={!open}
                />
              </div>
              <div className="status-wrap">
                <button
                  className={'status-line ' + st.light}
                  aria-describedby={'glance-' + person.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(person.id);
                  }}
                >
                  <i aria-hidden="true" />
                  {lightText}
                  {!open && st.count > 0 && <Lock size={13} className="status-lock" />}
                </button>
                <span className="glance" role="tooltip" id={'glance-' + person.id}>
                  {open ? (
                    issues.length ? (
                      <>
                        {issues.map((i) => (
                          <span key={i.key} className="glance-row">
                            {i.icon}
                            <span>
                              <b>{i.label}</b>
                              {i.signal && <small>{i.signal.compare}</small>}
                            </span>
                          </span>
                        ))}
                        <em>
                          Open profile
                          <ArrowUpRight size={13} />
                        </em>
                      </>
                    ) : (
                      <>
                        <b>Nothing flagged</b>
                        <small>No rule is flagged. This does not confirm good health.</small>
                      </>
                    )
                  ) : (
                    <>
                      <b>
                        {st.count
                          ? `${st.count} ${st.count === 1 ? 'item' : 'items'} to review`
                          : 'Details are private'}
                      </b>
                      <small>
                        Which system and the values stay private on the shared screen. Sign in with{' '}
                        {person.name.split(' ')[0]}’s profile PIN to view them.
                      </small>
                    </>
                  )}
                </span>
              </div>
              <DailyCheck
                data={data}
                person={person}
                onMeasure={onMeasure}
                onHistory={onHistory}
                now={now}
              />
            </article>
          );
        })}
      </section>
      <p className="page-note">
        Shared screen: only general status is shown. Sign in with the profile PIN to open private
        records. Illustrative data and alerts are not a diagnosis.
      </p>
      <CommanderAlerts enabled={isCommander} />
    </div>
  );
}
