import React, { useState } from 'react';
import { Send, Stethoscope, Radio, BellRing, Check } from 'lucide-react';
import { SYMPTOMS, INTENSITY, ONSET, validateReport } from '../models/healthReport.js';

// Defined outside the dialog so it is not remounted on every render (that would swallow clicks).
function Chips({ value, options, label, onPick }) {
  return (
    <div className="rp-chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          type="button"
          key={o}
          aria-pressed={value === o}
          className={value === o ? 'selected' : ''}
          onClick={() => onPick(o)}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/** A person tells the crew's medical officer — and, if they want, the ground team — that something is wrong. */
export default function ReportProblem({
  Modal,
  person,
  connection,
  onClose,
  onSubmit,
  onEmergency,
}) {
  const [r, setR] = useState({
      what: '',
      where: '',
      intensity: '',
      since: '',
      note: '',
      toCmo: true,
      toEarth: true,
    }),
    [issue, setIssue] = useState('');
  const set = (k, v) => {
    setR((x) => ({ ...x, [k]: v }));
    setIssue('');
  };
  const first = person.name.split(' ')[0];
  const submit = (e) => {
    e.preventDefault();
    const err = validateReport(r);
    if (err) return setIssue(err);
    onSubmit(r);
  };
  return (
    <Modal title="Report a problem" onClose={onClose}>
      <form className="report-problem" onSubmit={submit}>
        <h2 className="modal-title">What’s wrong, {first}?</h2>
        <p className="muted">
          This lets the medical officer know, and can send a report to Earth. It does not call the
          crew to come and help.
        </p>
        <section>
          <h3>What is happening</h3>
          <Chips
            value={r.what}
            options={SYMPTOMS}
            label="What is happening"
            onPick={(v) => set('what', v)}
          />
        </section>
        <label className="rp-where">
          Where, if it helps <span>Optional</span>
          <input
            value={r.where}
            maxLength={80}
            onChange={(e) => set('where', e.target.value)}
            placeholder="For example: lower right side of the stomach"
          />
        </label>
        <div className="rp-two">
          <section>
            <h3>How strong</h3>
            <Chips
              value={r.intensity}
              options={INTENSITY}
              label="How strong"
              onPick={(v) => set('intensity', v)}
            />
          </section>
          <section>
            <h3>Since when</h3>
            <Chips
              value={r.since}
              options={ONSET}
              label="Since when"
              onPick={(v) => set('since', v)}
            />
          </section>
        </div>
        <label>
          Anything else <span>Optional</span>
          <textarea
            rows={3}
            maxLength={1000}
            value={r.note}
            onChange={(e) => set('note', e.target.value)}
            placeholder="How it feels, what makes it better or worse"
          />
        </label>
        <section>
          <h3>Who receives it</h3>
          <div className="rp-targets">
            <label className={'rp-target' + (r.toCmo ? ' on' : '')}>
              <input
                type="checkbox"
                checked={r.toCmo}
                onChange={(e) => set('toCmo', e.target.checked)}
              />
              <Stethoscope size={20} />
              <span>
                <b>Medical officer on board</b>
                <small>Appears in {first}’s private profile</small>
              </span>
              <Check size={18} className="tick" />
            </label>
            <label className={'rp-target' + (r.toEarth ? ' on' : '')}>
              <input
                type="checkbox"
                checked={r.toEarth}
                onChange={(e) => set('toEarth', e.target.checked)}
              />
              <Radio size={20} />
              <span>
                <b>Ground medical team</b>
                <small>
                  {connection === 'offline'
                    ? 'Queued until the link is back'
                    : 'Sent with saved samples attached'}
                </small>
              </span>
              <Check size={18} className="tick" />
            </label>
          </div>
        </section>
        {r.intensity === 'Severe' && (
          <div className="rp-urgent" role="note">
            <BellRing size={18} />
            <span>If you need someone with you now, use Emergency instead.</span>
            <button type="button" onClick={onEmergency}>
              Open Emergency
            </button>
          </div>
        )}
        {issue && (
          <p className="error-text" role="alert">
            {issue}
          </p>
        )}
        <button className="button primary full">
          <Send size={17} />
          Send report
        </button>
        <p className="station-small-print">Simulated channel. No real medical team is contacted.</p>
      </form>
    </Modal>
  );
}
