import React, { useState } from 'react';
import {
  Radio,
  Shield,
  Send,
  CheckCheck,
  WifiOff,
  ExternalLink,
  ArrowUpRight,
} from 'lucide-react';
import { officialResources, risks, hazards } from '../../health/models/risks.js';
import { RULESET_VERSION } from '../../alerts/models/rules.js';
import { LockedPanel } from '../../auth/components/AccessUI.jsx';
import {
  crew,
  metrics,
  stamp,
  latest,
  valueLabel,
  slotNames,
} from '../../crew/models/crewModel.js';
import { apiConfigured } from '../../../shared/api/apiClient.js';
import { useSources } from '../../sources/hooks/useSources.js';
import { A11Y_DEFAULTS } from '../models/accessibility.js';
export const connectionNames = {
  online: 'Earth link available',
  delayed: 'Earth link delayed',
  offline: 'Earth link unavailable',
};
export function ConnectionControls({ data, setData }) {
  return (
    <div className="connection-controls">
      <div>
        <Radio size={22} />
        <div>
          <b>{connectionNames[data.connection]}</b>
          <p>
            {data.connection === 'delayed'
              ? `${data.latency} min transmission each way. Medical response time is not guaranteed.`
              : data.connection === 'offline'
                ? 'Reports remain queued on board until the link returns.'
                : 'Technical receipt is simulated in a few seconds.'}
          </p>
        </div>
      </div>
      <label>
        Simulate Earth link
        <select
          value={data.connection}
          onChange={(e) => setData((d) => ({ ...d, connection: e.target.value }))}
        >
          <option value="online">Available</option>
          <option value="delayed">Delayed</option>
          <option value="offline">Unavailable</option>
        </select>
      </label>
    </div>
  );
}
export function Medical({
  data,
  operator,
  setData,
  onSend,
  initial,
  canView = () => true,
  onUnlock,
}) {
  const [patient, setPatient] = useState(initial?.patient || operator.id),
    [body, setBody] = useState(initial?.body || '');
  const person = crew.find((c) => c.id === patient);
  const fromEmergency = !!initial?.body;
  const allowed = fromEmergency || patient === 'unknown' || canView(patient);
  const send = (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    const samples = Object.entries(metrics).map(([k, m]) => {
      const r = latest(data.records, patient, k);
      return r
        ? `${m.label}: ${valueLabel(r)} ${m.unit}, ${stamp(r.time)} (${slotNames[r.slot] || 'Additional assessment'})`
        : m.label + ': not recorded';
    });
    onSend(
      patient,
      body.trim() + '\n\nSaved samples (not current live values):\n' + samples.join('\n'),
    );
    setBody('');
  };
  return (
    <>
      <div className="overview-heading">
        <div>
          <div className="section-kicker">Ground medical support</div>
          <h1>Ground support</h1>
          <p>Send a question or handover to the medical team on Earth. Saved data is attached.</p>
        </div>
      </div>
      <ConnectionControls data={data} setData={setData} />
      <div className="medical-grid">
        <form className="panel compose" onSubmit={send}>
          <div className="section-heading">
            <h3>New report</h3>
            <Shield size={17} />
          </div>
          <label>
            Crew member
            <select value={patient} onChange={(e) => setPatient(e.target.value)}>
              <option value="unknown">Not yet identified</option>
              {crew.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {!allowed ? (
            <LockedPanel compact person={person} what="report" onUnlock={() => onUnlock(patient)} />
          ) : (
            <>
              <label>
                Question or handover
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                  maxLength={5000}
                  rows={6}
                  placeholder="What was observed, onset, actions taken and what support is needed"
                />
              </label>
              <p className="attachment-note">
                Saved samples and their acquisition times will be attached.
              </p>
              <button className="button primary full">
                <Send size={16} />
                {data.connection === 'offline' ? 'Queue report on board' : 'Send simulated report'}
              </button>
              <p className="station-small-print">
                Ground reports are separate from the immediate on-board crew alert. This prototype
                does not contact real medical staff.
              </p>
            </>
          )}
        </form>
        <section className="panel message-list">
          <div className="section-heading">
            <h3>Report queue</h3>
            <span>{data.messages.length} reports</span>
          </div>
          {data.messages.length ? (
            data.messages.map((m) => (
              <article className="message" key={m.id}>
                <div>
                  <span className="pill">
                    {m.kind === 'health-report' ? 'Problem report' : 'Ground report'}
                  </span>
                  <time>{stamp(m.createdAt)}</time>
                </div>
                <h4>{crew.find((c) => c.id === m.patient)?.name || 'Person not identified'}</h4>
                <p className="message-body">
                  {m.patient === 'unknown' || canView(m.patient)
                    ? m.body
                    : 'Report content is private. Unlock this person’s profile to read it.'}
                </p>
                <div className={'message-state ' + m.status}>
                  {m.status === 'received' ? (
                    <CheckCheck size={15} />
                  ) : m.status === 'pending' ? (
                    <WifiOff size={15} />
                  ) : (
                    <Send size={15} />
                  )}{' '}
                  {m.status === 'received'
                    ? 'Technical receipt simulated'
                    : m.status === 'pending'
                      ? 'Queued on board'
                      : 'In transit to Earth'}
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">
              <Radio size={30} />
              <h3>No reports yet.</h3>
              <p>Your submitted reports appear here.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
const operational = [
  [
    'NASA medical operations',
    'Mission-specific health requirements and private medical communications',
    'https://www.nasa.gov/reference/6-0-medical-operations/',
  ],
  [
    'NASA crew medical training',
    'Crew and CMO training requirements',
    'https://www.nasa.gov/reference/5-0-training/',
  ],
  [
    'NASA autonomous medical operations',
    'Decision support for crews beyond immediate ground contact',
    'https://www.nasa.gov/directorates/stmd/game-changing-development-program/autonomous-medical-operations-amo/',
  ],
];
export function Sources({ onRisk }) {
  const sourcesQuery = useSources(apiConfigured);
  return (
    <>
      <div className="overview-heading">
        <div>
          <div className="section-kicker">Reference library</div>
          <h1>Reference library</h1>
          <p>The official challenge resources and how SOMA uses each one.</p>
        </div>
      </div>
      {apiConfigured && (
        <section className="library-section">
          <div className="library-heading">
            <h2>Backend source registry</h2>
          </div>
          {sourcesQuery.isPending ? (
            <p className="muted">Loading registered sources…</p>
          ) : sourcesQuery.error ? (
            <p className="banner warning">
              Could not load backend sources: {sourcesQuery.error.message}
            </p>
          ) : (
            <div className="panel sources-list">
              {sourcesQuery.data.map((source) => (
                <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
                  <div>
                    <h4>{source.title}</h4>
                    <p>
                      {source.agency} · {source.doc_type}
                    </p>
                  </div>
                  <ExternalLink size={17} />
                </a>
              ))}
            </div>
          )}
        </section>
      )}
      <section className="library-section">
        <div className="library-heading">
          <h2>Official challenge resources</h2>
          <span>NASA Space Apps 2026 · Resources tab</span>
        </div>
        <div className="resource-grid">
          {officialResources.map((r, i) => (
            <article key={r.id} className="resource-card">
              <div className="resource-top">
                <span className={'org-tag ' + r.org.toLowerCase()}>{r.org}</span>
                <span className="resource-index">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <h3>{r.title}</h3>
              <p>{r.summary}</p>
              <div className="used-for">
                <b>Used in SOMA</b>
                <p>{r.usedFor}</p>
              </div>
              <a href={r.url} target="_blank" rel="noreferrer" className="text-link">
                Open {r.org} resource
                <ExternalLink size={14} />
              </a>
            </article>
          ))}
        </div>
      </section>
      <section className="library-section">
        <div className="library-heading">
          <h2>Risk context by indicator</h2>
          <span>Pages linked from the official resources</span>
        </div>
        <div className="panel risk-index">
          {Object.values(risks).map((r) => (
            <button key={r.id} onClick={() => onRisk(r.id)}>
              <span className="org-tag small">{hazards[r.hazard].label}</span>
              <b>{r.title}</b>
              <small>{r.soma}</small>
              <ArrowUpRight size={16} />
            </button>
          ))}
        </div>
      </section>
      <section className="library-section">
        <div className="library-heading">
          <h2>Operational context</h2>
          <span>Supporting references, outside the challenge list</span>
        </div>
        <div className="panel sources-list">
          {operational.map(([title, description, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              <div>
                <h4>{title}</h4>
                <p>{description}</p>
              </div>
              <ExternalLink size={17} />
            </a>
          ))}
        </div>
      </section>
      <div className="panel scope-note">
        <h3>Prototype scope</h3>
        <p>
          One check-in per person and day is a design choice for this demonstration, not a NASA
          medical requirement. The check-in uses one shared setup confirmation and one shared
          reading confirmation. These reflect the operator’s actions. The app cannot verify
          instrument placement or clinical quality automatically.
        </p>
        <p>
          Trend signals come from deterministic demonstration rules (ruleset {RULESET_VERSION}) that
          compare each saved sample with a personal 7-day baseline. Thresholds are illustrative and
          not clinically validated. Environment values are synthetic. Body markers show which body
          system has a flagged rule. The assistant cites its sources and never diagnoses. Sensors,
          crew notifications and ground delivery are simulated. All crew and health data are
          fictional.
        </p>
      </div>
    </>
  );
}
function Segmented({ label, value, options, onChange }) {
  return (
    <div className="seg-field" role="radiogroup" aria-label={label}>
      <span className="field-label">{label}</span>
      <div className="segmented-v3">
        {options.map(([v, t]) => (
          <button
            key={v}
            role="radio"
            aria-checked={value === v}
            className={value === v ? 'on' : ''}
            onClick={() => onChange(v)}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="toggle-row">
      <span>
        <b>{label}</b>
        {hint && <small>{hint}</small>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <i aria-hidden="true" />
    </label>
  );
}

export function SettingsPanel({ onClose, Modal, a11y, setA11y }) {
  const set = (k, v) => setA11y((p) => ({ ...p, [k]: v }));
  return (
    <Modal title="Settings" onClose={onClose} wide>
      <div className="settings-v3">
        <section className="settings-card">
          <h3>Appearance and accessibility</h3>
          <p className="settings-hint">Saved on this device. Applies to every screen.</p>
          <Segmented
            label="Theme"
            value={a11y.theme}
            onChange={(v) => set('theme', v)}
            options={[
              ['light', 'Light'],
              ['dark', 'Dark'],
              ['system', 'Follow system'],
            ]}
          />
          <Segmented
            label="Text size"
            value={a11y.text}
            onChange={(v) => set('text', v)}
            options={[
              ['standard', 'Standard'],
              ['large', 'Large'],
              ['xlarge', 'Extra large'],
            ]}
          />
          <Segmented
            label="Motion"
            value={a11y.motion}
            onChange={(v) => set('motion', v)}
            options={[
              ['system', 'Follow system'],
              ['reduce', 'Reduce'],
            ]}
          />
          <Toggle
            label="High contrast"
            hint="Darker text, stronger borders, no translucent surfaces."
            checked={a11y.contrast}
            onChange={(v) => set('contrast', v)}
          />
          <Toggle
            label="Easier reading"
            hint="More space between letters, words and lines."
            checked={a11y.readable}
            onChange={(v) => set('readable', v)}
          />
          <Toggle
            label="Underline links"
            hint="Show links without relying on colour."
            checked={a11y.underline}
            onChange={(v) => set('underline', v)}
          />
          <button className="text-link" onClick={() => setA11y({ ...A11Y_DEFAULTS })}>
            Restore defaults
          </button>
        </section>
      </div>
    </Modal>
  );
}
