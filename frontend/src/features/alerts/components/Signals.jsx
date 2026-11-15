import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Info,
  ExternalLink,
  BookOpen,
  LineChart,
  ShieldCheck,
  ArrowUpRight,
  Layers,
} from 'lucide-react';
import { metrics, stamp } from '../../crew/models/crewModel.js';
import { levelLabel } from '../models/rules.js';
import { risks, hazards, research, ACCESSED } from '../../health/models/risks.js';

const icon = (s) => (s.level === 'info' ? Info : (s.delta ?? 0) < 0 ? TrendingDown : TrendingUp);

/** Compact summary for a crew card. */
export function SignalSummary({ signals }) {
  const active = signals.filter((s) => s.level !== 'info');
  const info = signals.filter((s) => s.level === 'info');
  if (!signals.length)
    return (
      <div className="signal-summary calm">
        <ShieldCheck size={15} />
        <span>No rule flagged</span>
      </div>
    );
  const top = active[0] || info[0];
  const Icon = icon(top);
  return (
    <div className={'signal-summary ' + top.level}>
      <Icon size={15} />
      <span>
        <b>
          {active.length
            ? `${active.length} ${active.length === 1 ? 'item' : 'items'} to review`
            : 'No recent data'}
        </b>
        {active.length
          ? active.map((s) => metrics[s.metric]?.short || s.metric).join(' · ')
          : top.title}
      </span>
    </div>
  );
}

export function SignalCard({ signal, onRisk, onHistory, compact = false }) {
  const Icon = icon(signal);
  const risk = signal.riskIds?.[0] && risks[signal.riskIds[0]];
  return (
    <article className={'signal-card ' + signal.level}>
      <header>
        <span className="signal-icon">
          <Icon size={18} />
        </span>
        <div>
          <span className="signal-level">{levelLabel[signal.level]}</span>
          <h3>{signal.title}</h3>
        </div>
        <span className="rule-tag" title={`Rule ${signal.ruleId}, ruleset ${signal.ruleVersion}`}>
          {signal.ruleId}
        </span>
      </header>
      <p className="signal-reason">{signal.reason}</p>
      {signal.whoActs && signal.level !== 'info' && (
        <p className="signal-who">
          <b>Who acts</b> {signal.whoActs}
        </p>
      )}
      {!compact && (
        <dl className="signal-meta">
          <div>
            <dt>Rule</dt>
            <dd>{signal.threshold}</dd>
          </div>
          <div>
            <dt>Evaluated</dt>
            <dd>
              {stamp(signal.evaluatedAt)} · ruleset {signal.ruleVersion}
            </dd>
          </div>
        </dl>
      )}
      <p className="signal-disclaimer">
        Illustrative threshold from the SOMA spec, not clinically validated. This is not a
        diagnosis.
      </p>
      <footer>
        {risk && onRisk && (
          <button className="text-link" onClick={() => onRisk(risk.id)}>
            <BookOpen size={14} />
            Why this matters · NASA
          </button>
        )}
        {signal.metric && metrics[signal.metric] && onHistory && (
          <button className="text-link" onClick={() => onHistory(signal.crewId, signal.metric)}>
            <LineChart size={14} />
            View in History
          </button>
        )}
      </footer>
    </article>
  );
}

export function SignalList({
  signals,
  onRisk,
  onHistory,
  empty = 'No trends flagged for this person.',
}) {
  if (!signals.length)
    return (
      <div className="signal-empty">
        <ShieldCheck size={18} />
        <div>
          <b>{empty}</b>
          <p>
            The spec rules check sleep, mood, heart rate, blood pressure, blood sugar, temperature
            and exercise. No flag does not confirm good health.
          </p>
        </div>
      </div>
    );
  return (
    <div className="signal-list">
      {signals.map((s) => (
        <SignalCard key={s.id} signal={s} onRisk={onRisk} onHistory={onHistory} />
      ))}
    </div>
  );
}

/** Context sheet for one NASA/CSA risk, opened from indicators, signals and the assistant. */
export function RiskSheet({ riskId, onClose, Modal }) {
  const r = risks[riskId];
  if (!r) return null;
  const h = hazards[r.hazard];
  return (
    <Modal title={`${r.org} risk context`} onClose={onClose} wide>
      <div className="risk-sheet">
        <div className="risk-hazard">
          <Layers size={14} />
          Hazard ·{' '}
          <a href={h.url} target="_blank" rel="noreferrer">
            {h.label}
          </a>
        </div>
        <h2 className="modal-title">{r.title}</h2>
        {r.indicative && (
          <p className="risk-indicative">
            Indicative link: the SOMA indicator gives context for this risk but does not measure it.
          </p>
        )}
        <p className="risk-summary">{r.summary}</p>
        <div className="risk-columns">
          <section>
            <h3>How SOMA uses it</h3>
            <p>{r.soma}</p>
          </section>
          <section>
            <h3>What SOMA does not do</h3>
            <p>{r.limits}</p>
          </section>
        </div>
        {r.research?.length > 0 && (
          <section className="risk-research">
            <h3>Related research</h3>
            {r.research
              .map((k) => research[k])
              .map((x) => (
                <a key={x.url} href={x.url} target="_blank" rel="noreferrer">
                  <span>
                    <b>{x.title}</b>
                    <small>{x.note}</small>
                  </span>
                  <ArrowUpRight size={16} />
                </a>
              ))}
          </section>
        )}
        <a className="button primary risk-open" href={r.url} target="_blank" rel="noreferrer">
          <ExternalLink size={16} />
          Open the {r.org} page
        </a>
        <p className="station-small-print">
          Summary written for SOMA from the official {r.org} page, accessed {ACCESSED}. Check the
          source for current wording.
        </p>
      </div>
    </Modal>
  );
}
