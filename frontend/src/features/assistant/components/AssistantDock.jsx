import React, { useEffect, useRef, useState } from 'react';
import { X, LockOpen, Lock } from 'lucide-react';
import SomaFace from '../../crew/components/SomaFace.jsx';
import CrewAssistant from './CrewAssistant.jsx';
import { crew } from '../../crew/models/crewModel.js';

const GENERAL = { id: 'general', name: 'Crew', general: true };

/** Floating entry to the assistant, bottom right on every screen. */
export default function AssistantDock({
  data,
  personId,
  canView,
  onAppend,
  onStation,
  onEmergency,
  onRisk,
  onUnlock,
}) {
  const [open, setOpen] = useState(false),
    [mood, setMood] = useState('idle'),
    timer = useRef(),
    panel = useRef();
  const person = personId && canView(personId) ? crew.find((c) => c.id === personId) : null;
  const status = (s) => {
    clearTimeout(timer.current);
    setMood(s);
    if (s === 'happy' || s === 'concerned')
      timer.current = setTimeout(() => setMood(open ? 'idle' : 'idle'), 2800);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!open) return;
    const key = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', key);
    panel.current?.querySelector('input')?.focus();
    return () => document.removeEventListener('keydown', key);
  }, [open]);
  return (
    <>
      {open && (
        <section className="dock-panel" role="dialog" aria-label="SOMA assistant" ref={panel}>
          <header>
            <SomaFace mood={mood} size={44} follow={false} />
            <div>
              <h2>SOMA assistant</h2>
              <p>
                {person ? (
                  <>
                    <LockOpen size={13} />
                    {person.name} · private thread
                  </>
                ) : (
                  <>
                    <Lock size={13} />
                    General questions · no personal data
                  </>
                )}
              </p>
            </div>
            <button
              className="icon-only"
              aria-label="Close assistant"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </header>
          {!person && personId && (
            <button className="dock-unlock" onClick={() => onUnlock(personId)}>
              Unlock {crew.find((c) => c.id === personId)?.name.split(' ')[0]}’s thread
            </button>
          )}
          <div className="dock-body">
            <CrewAssistant
              key={person?.id || 'general'}
              compact
              person={person || GENERAL}
              data={data}
              onAppend={onAppend}
              onStation={person ? onStation : undefined}
              onEmergency={onEmergency}
              onRisk={onRisk}
              onStatus={status}
            />
          </div>
        </section>
      )}
      <button
        className={'dock-fab mood-' + mood + (open ? ' open' : '')}
        aria-label={open ? 'Close SOMA assistant' : 'Ask SOMA'}
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          status(open ? 'idle' : 'listening');
        }}
      >
        <SomaFace mood={mood} size={64} />
        {!open && <span className="dock-hint">Ask SOMA</span>}
      </button>
    </>
  );
}
