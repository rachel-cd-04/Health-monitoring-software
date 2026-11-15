import React, { useEffect, useRef, useState } from 'react';
import {
  MessageCircle,
  Send,
  ArrowUpRight,
  Shield,
  BookOpen,
  Database,
  Cpu,
  FileText,
} from 'lucide-react';
import { emergencyReply, emergencyPrompts } from '../models/assistantLogic.js';
import { assistantMode, resolveSource } from '../services/assistantAdapter.js';
import { useAssistant } from '../hooks/useAssistant.js';
import { officialResources } from '../../health/models/risks.js';
import { timeLabel, localId } from '../../crew/models/crewModel.js';
import Markdown from '../../../shared/components/Markdown.jsx';
import MicButton from '../../../shared/components/MicButton.jsx';
import { useSpeechInput } from '../../../shared/hooks/useSpeechInput.js';
import { useSpeechOutput } from '../../../shared/hooks/useSpeechOutput.js';
import SpeakButton from '../../../shared/components/SpeakButton.jsx';

export function Sources({ items, onRisk }) {
  const list = (items || []).map((s) => resolveSource(s, officialResources)).filter(Boolean);
  if (!list.length) return null;
  return (
    <div className="chat-sources">
      <span>
        <BookOpen size={12} />
        Sources
      </span>
      {list.map((s) =>
        s.riskId && onRisk ? (
          <button key={s.url} className="source-chip" onClick={() => onRisk(s.riskId)}>
            {s.org} · {s.title}
          </button>
        ) : (
          <a key={s.url} className="source-chip" href={s.url} target="_blank" rel="noreferrer">
            {s.org} · {s.title}
            <ArrowUpRight size={11} />
          </a>
        ),
      )}
    </div>
  );
}

export default function CrewAssistant({
  person,
  data,
  onAppend,
  onStation,
  onEmergency,
  alert,
  onAssessment,
  onRisk,
  onStatus,
  compact = false,
  paused = false,
}) {
  const [input, setInput] = useState(''),
    [busy, setBusy] = useState(false);
  const timer = useRef(),
    end = useRef(),
    field = useRef(),
    alive = useRef(true);
  const tts = useSpeechOutput();
  const { askAssistant } = useAssistant();
  const key = alert ? 'emergency-' + alert.id : person.id;
  const messages = data.chatThreads[key] || [];
  const mode = alert ? 'guided' : assistantMode();
  useEffect(
    () => () => {
      alive.current = false;
      clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    end.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'nearest',
    });
  }, [messages.length, busy]);
  // `viaVoice`: the question was spoken, so the answer is read aloud too (voice mode).
  const send = async (text, { viaVoice = false } = {}) => {
    if (!text.trim() || busy) return;
    const message = text.trim();
    tts.stop();
    setInput('');
    onStatus?.('thinking');
    onAppend(key, { id: localId(), role: 'user', text: message, time: Date.now() });
    setBusy(true);
    if (alert) {
      timer.current = setTimeout(() => {
        const reply = emergencyReply(message, alert.assessment);
        if (reply.assessment) onAssessment?.(alert.id, reply.assessment);
        const replyId = localId();
        if (viaVoice) tts.speak(replyId, reply.text);
        onAppend(key, {
          id: replyId,
          role: 'assistant',
          text: reply.text,
          engine: 'guided',
          time: Date.now(),
        });
        setBusy(false);
      }, 400);
      return;
    }
    const started = Date.now();
    let reply;
    try {
      reply = await askAssistant({ message, person, data, thread: key });
    } catch {
      reply = {
        text: 'The mission assistant is unavailable right now. Your saved health data and emergency tools are still available.',
        sources: [],
        dataUsed: [],
        engine: 'unavailable',
        unavailable: true,
      };
    }
    const wait = Math.max(0, 400 - (Date.now() - started));
    timer.current = setTimeout(() => {
      if (!alive.current) return;
      onStatus?.(reply.action === 'emergency' ? 'concerned' : 'happy');
      const replyId = localId();
      if (viaVoice) tts.speak(replyId, reply.text);
      onAppend(key, {
        id: replyId,
        role: 'assistant',
        text: reply.text,
        action: reply.action,
        sources: reply.sources,
        caution: reply.caution,
        dataUsed: reply.dataUsed,
        ruleIds: reply.ruleIds,
        engine: reply.engine,
        fallback: reply.fallback,
        unavailable: reply.unavailable,
        time: Date.now(),
      });
      setBusy(false);
    }, wait);
  };
  // Voice input: the spoken question is sent when the person stops talking, and its answer is read aloud.
  const voice = useSpeechInput({ onResult: (text) => send(text, { viaVoice: true }) });
  const toggleVoice = () => {
    if (!voice.listening) {
      tts.stop(); // don't let the microphone hear SOMA talking
      onStatus?.('listening');
    }
    voice.toggle();
  };
  const cancelVoice = voice.cancel;
  useEffect(() => {
    if (paused) cancelVoice(); // hidden (e.g. minimised): never keep the microphone on
  }, [paused, cancelVoice]);
  const wasListening = useRef(false);
  useEffect(() => {
    // Back to idle if listening ended without a question (send() switches to 'thinking' otherwise).
    if (wasListening.current && !voice.listening && !busy) onStatus?.('idle');
    wasListening.current = voice.listening;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.listening]);
  const prompts = alert
    ? emergencyPrompts(alert.assessment)
    : person.general
      ? [
          'Why does SOMA track sleep?',
          'How does the daily check-in work?',
          'How is my data kept private?',
        ]
      : [
          'Explain my trends',
          'Show my saved readings',
          'Why does SOMA track sleep?',
          'When is my next check-in?',
        ];
  const badge = alert ? 'Guided protocol' : mode === 'service' ? 'AI service' : 'Scripted demo';
  return (
    <section
      className={
        'crew-assistant ' + (alert ? 'emergency-assistant' : '') + (compact ? ' compact' : '')
      }
      aria-label={alert ? 'Emergency assistant' : 'Personal assistant'}
    >
      <header>
        <span className="assistant-mark">
          <MessageCircle size={21} />
        </span>
        <div>
          <h3>{alert ? 'Emergency coordination' : 'SOMA assistant'}</h3>
          <p>{person?.name || 'Unidentified crew member'}</p>
        </div>
        <span className={'placeholder-badge ' + mode}>
          {mode === 'service' ? <Cpu size={12} /> : <FileText size={12} />}
          {badge}
        </span>
      </header>
      <div className="assistant-scope">
        <Shield size={14} />
        {alert
          ? 'Deterministic guided questions. No language model is used in emergencies. Follow mission-approved procedures.'
          : mode === 'service'
            ? 'Answers come from the mission assistant service, using de-identified context and rule results. They cite their sources and never diagnose.'
            : 'No AI model connected. Scripted replies use saved records, rule results and the NASA/CSA references, and cite their sources.'}
      </div>
      <div className="chat-messages" aria-live="polite" aria-relevant="additions">
        <article className="chat-message assistant">
          <span>SOMA</span>
          <p>
            {alert
              ? 'The on-board crew alert is active. Ask for the CMO now. I can help document responsiveness, breathing, onset and actions for a handover. Do not delay immediate assistance to use this chat.'
              : person.general
                ? 'Hi, I’m SOMA. Ask me how the station works or why each indicator matters. For personal readings, open a profile with its code.'
                : `Hello ${person.name.split(' ')[0]}. I can explain your trends, your saved check-ins and why each indicator is tracked, with the sources behind it.`}
          </p>
        </article>
        {messages.map((m) => (
          <article key={m.id} className={'chat-message ' + m.role}>
            <span>
              {m.role === 'assistant' ? 'SOMA' : 'Crew'}
              <time>{timeLabel(m.time)} UTC</time>
              {m.role === 'assistant' && m.unavailable && (
                <em className="fallback-tag">Mission assistant unavailable</em>
              )}
              {m.role === 'assistant' && <SpeakButton tts={tts} id={m.id} text={m.text} />}
            </span>
            {m.role === 'assistant' ? <Markdown text={m.text} /> : <p>{m.text}</p>}
            {m.dataUsed?.length > 0 && (
              <details className="chat-data">
                <summary>
                  <Database size={12} />
                  Data used ({m.dataUsed.length})
                </summary>
                <ul>
                  {m.dataUsed.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </details>
            )}
            <Sources items={m.sources} onRisk={onRisk} />
            {m.caution && (
              <p className="chat-caution">
                <Shield size={12} />
                {m.caution}
              </p>
            )}
            {m.action === 'station' && onStation && (
              <button className="chat-action" onClick={onStation}>
                Open check-in station
                <ArrowUpRight size={13} />
              </button>
            )}
            {m.action === 'emergency' && onEmergency && (
              <button className="chat-action urgent" onClick={onEmergency}>
                Alert the crew
                <ArrowUpRight size={13} />
              </button>
            )}
          </article>
        ))}
        {busy && (
          <div className="typing-indicator" aria-label="Preparing response">
            <i />
            <i />
            <i />
          </div>
        )}
        <div ref={end} />
      </div>
      <div className="chat-prompts">
        {prompts.map((p) => (
          <button disabled={busy} key={p} onClick={() => send(p)}>
            {p}
          </button>
        ))}
      </div>
      {voice.error && (
        <p className="voice-error" role="status">
          {voice.error}
        </p>
      )}
      <form
        className={'chat-compose' + (voice.listening ? ' listening' : '')}
        onSubmit={(e) => {
          e.preventDefault();
          if (voice.listening) voice.stop();
          else send(input);
        }}
      >
        <label className="sr-only" htmlFor={'chat-' + key}>
          Message for SOMA
        </label>
        <input
          id={'chat-' + key}
          ref={field}
          value={voice.listening ? voice.transcript : input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => onStatus?.('listening')}
          onBlur={() => !voice.listening && onStatus?.('idle')}
          maxLength={1500}
          readOnly={voice.listening}
          placeholder={
            voice.listening
              ? 'Listening… speak now'
              : alert
                ? 'Describe what you observe…'
                : person.general
                  ? 'Ask how SOMA works…'
                  : 'Ask about trends, check-ins or why something is tracked…'
          }
          disabled={busy}
        />
        <MicButton voice={{ ...voice, toggle: toggleVoice }} disabled={busy} />
        <button
          aria-label="Send message"
          disabled={busy || (!voice.listening && !input.trim())}
        >
          <Send size={17} />
        </button>
      </form>
      <p className="chat-footer">
        Questions and replies stay in this {alert ? 'incident' : 'crew member’s'} thread.
      </p>
    </section>
  );
}
