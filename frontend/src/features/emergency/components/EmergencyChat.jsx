import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Info, MessageSquareText, Shield, WifiOff, X } from 'lucide-react';
import { askEmergencyAssistant } from '../../assistant/services/assistantAdapter.js';
import { emergencyChatPrompts } from '../../assistant/models/assistantLogic.js';
import { Sources } from '../../assistant/components/CrewAssistant.jsx';
import { apiConfigured } from '../../../shared/api/apiClient.js';
import { localId, timeLabel } from '../../crew/models/crewModel.js';
import Markdown from '../../../shared/components/Markdown.jsx';

/**
 * "Ask SOMA" panel inside the emergency guide. Answers questions about the step on screen; the guide
 * and the CMO always lead. Works offline (it then restates the current step).
 */
export default function EmergencyChat({ threadKey, messages, onAppend, context, onClose }) {
  const [input, setInput] = useState(''),
    [busy, setBusy] = useState(false);
  const alive = useRef(true),
    list = useRef(),
    field = useRef();
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    const el = list.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, busy]);

  const send = async (raw) => {
    const message = raw.trim();
    if (!message || busy) return;
    setInput('');
    onAppend(threadKey, { id: localId(), role: 'user', text: message, time: Date.now() });
    setBusy(true);
    const reply = await askEmergencyAssistant({ message, context, history: messages });
    if (!alive.current) return;
    onAppend(threadKey, {
      id: localId(),
      role: 'assistant',
      text: reply.text,
      sources: reply.sources,
      engine: reply.engine,
      unavailable: reply.unavailable,
      time: Date.now(),
    });
    setBusy(false);
    field.current?.focus();
  };

  const online = apiConfigured;
  const stepLabel = context?.step?.title;
  const prompts = emergencyChatPrompts(context?.step);

  return (
    <section className="em-chat" aria-label="Ask SOMA about this emergency">
      <header className="em-chat-head">
        <span className="em-chat-mark" aria-hidden="true">
          <MessageSquareText size={19} />
        </span>
        <div>
          <h2>Ask SOMA</h2>
          <p>Questions about this emergency</p>
        </div>
        <span className={'em-chat-status' + (online ? '' : ' offline')}>
          {online ? <i aria-hidden="true" /> : <WifiOff size={12} />}
          {online ? 'AI assistant' : 'Offline guide'}
        </span>
        <button className="em-chat-close" onClick={onClose} aria-label="Close Ask SOMA">
          <X size={18} />
        </button>
      </header>

      {stepLabel && (
        <div className="em-chat-context">
          <Info size={14} />
          <span>
            Following: <b>{stepLabel}</b>
          </span>
        </div>
      )}

      <div className="em-chat-log" ref={list} aria-live="polite" aria-relevant="additions">
        {!messages.length && (
          <div className="em-chat-intro">
            <p>
              I can see the step you’re on. Ask why it matters, what to watch for, or what to tell the
              CMO.
            </p>
            <p className="muted">
              Keep going with the guide while you wait for an answer. It never needs this chat.
            </p>
          </div>
        )}
        {messages.map((m) => (
          <article key={m.id} className={'em-msg ' + (m.role === 'user' ? 'me' : 'soma')}>
            <header>
              {m.role === 'user' ? 'You' : 'SOMA'}
              <time>{timeLabel(m.time)}</time>
              {m.role === 'assistant' && m.engine === 'offline' && (
                <em>
                  <WifiOff size={11} />
                  Offline
                </em>
              )}
            </header>
            <div className="em-msg-body">
              {m.role === 'user' ? <p>{m.text}</p> : <Markdown text={m.text} />}
            </div>
            {m.role === 'assistant' && <Sources items={m.sources} />}
          </article>
        ))}
        {busy && (
          <div className="em-msg soma pending" aria-label="SOMA is answering">
            <span className="em-dots">
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
      </div>

      <div className="em-chat-prompts" aria-label="Suggested questions">
        {prompts.map((p) => (
          <button key={p} disabled={busy} onClick={() => send(p)}>
            {p}
          </button>
        ))}
      </div>

      <form
        className="em-chat-compose"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <label className="sr-only" htmlFor={'em-chat-' + threadKey}>
          Question for SOMA
        </label>
        <textarea
          id={'em-chat-' + threadKey}
          ref={field}
          rows={1}
          value={input}
          maxLength={1500}
          placeholder="Ask about this step…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        <button type="submit" aria-label="Send question" disabled={busy || !input.trim()}>
          <ArrowUp size={19} />
        </button>
      </form>
      <p className="em-chat-foot">
        <Shield size={13} />
        {online
          ? 'AI answers can be wrong. The guide and the CMO lead.'
          : 'No AI connected: answers repeat the guide. The CMO leads.'}
      </p>
    </section>
  );
}
