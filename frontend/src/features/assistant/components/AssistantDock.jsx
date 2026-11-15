import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, LockOpen, Lock, Minus, GripVertical } from 'lucide-react';
import SomaFace from '../../crew/components/SomaFace.jsx';
import CrewAssistant from './CrewAssistant.jsx';
import { crew } from '../../crew/models/crewModel.js';

const GENERAL = { id: 'general', name: 'Crew', general: true };
const STORE_KEY = 'soma.dock.position';
const EDGE = 8; // min distance between the button and the screen edge
const GAP = 12; // space between the button and the chat window
const DRAG_THRESHOLD = 6; // px of movement before a press becomes a drag

const readStored = () => {
  try {
    const p = JSON.parse(localStorage.getItem(STORE_KEY));
    return Number.isFinite(p?.x) && Number.isFinite(p?.y) ? p : null;
  } catch {
    return null;
  }
};
const store = (p) => {
  try {
    if (p) localStorage.setItem(STORE_KEY, JSON.stringify(p));
    else localStorage.removeItem(STORE_KEY);
  } catch {
    // Storage blocked: the position just isn't remembered.
  }
};
const clampTo = (p, size) =>
  p && {
    x: Math.min(Math.max(EDGE, p.x), window.innerWidth - size - EDGE),
    y: Math.min(Math.max(EDGE, p.y), window.innerHeight - size - EDGE),
  };

/** Place the chat window next to the button, on whichever side has room. */
function panelPlacement(pos, size) {
  if (!pos) return { style: undefined, hintRight: false };
  const vw = window.innerWidth,
    vh = window.innerHeight;
  const above = pos.y + size / 2 > vh / 2;
  const toRight = pos.x + size / 2 > vw / 2;
  const room = above ? pos.y - GAP - EDGE : vh - (pos.y + size) - GAP - EDGE;
  const style = {
    height: Math.max(240, Math.min(600, room)),
    top: above ? 'auto' : pos.y + size + GAP,
    bottom: above ? vh - pos.y + GAP : 'auto',
    transformOrigin: `${above ? 'bottom' : 'top'} ${toRight ? 'right' : 'left'}`,
  };
  if (vw <= 900) Object.assign(style, { left: 12, right: 12 });
  else if (toRight) Object.assign(style, { right: Math.max(EDGE, vw - pos.x - size), left: 'auto' });
  else Object.assign(style, { left: Math.max(EDGE, pos.x), right: 'auto' });
  return { style, hintRight: !toRight };
}

/** Floating entry to the assistant. Drag the button (or the window header) to move both. */
export default function AssistantDock({
  data,
  personId,
  canView,
  onAppend,
  onClear,
  onStation,
  onEmergency,
  onRisk,
  onUnlock,
}) {
  // 'closed' → nothing mounted · 'open' → visible · 'minimized' → hidden but kept (draft, pending reply)
  const [view, setView] = useState('closed'),
    [mood, setMood] = useState('idle'),
    [pos, setPos] = useState(null),
    [dragging, setDragging] = useState(false);
  const timer = useRef(),
    panel = useRef(),
    fab = useRef(),
    drag = useRef(null),
    suppressClick = useRef(false);
  const person = personId && canView(personId) ? crew.find((c) => c.id === personId) : null;
  const threadKey = person?.id || GENERAL.id;
  const count = (data.chatThreads[threadKey] || []).length;
  const [seen, setSeen] = useState(count);
  const open = view === 'open';
  const fabSize = () => fab.current?.offsetWidth || 72;

  const status = (s) => {
    clearTimeout(timer.current);
    setMood(s);
    if (s === 'happy' || s === 'concerned') timer.current = setTimeout(() => setMood('idle'), 2800);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  // Restore the remembered position and keep it on screen when the window is resized.
  useEffect(() => {
    setPos(clampTo(readStored(), fabSize()));
    const onResize = () => setPos((p) => clampTo(p, fabSize()));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (open) setSeen(count);
  }, [open, count]);
  useEffect(() => {
    setSeen(count);
    // A different thread starts "read"; only replies arriving while minimised count as new.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadKey]);

  useEffect(() => {
    if (!open) return;
    const key = (e) => {
      if (e.key === 'Escape') setView('minimized');
    };
    document.addEventListener('keydown', key);
    panel.current?.querySelector('input')?.focus();
    return () => document.removeEventListener('keydown', key);
  }, [open]);

  const minimize = () => {
    setView('minimized');
    status('idle');
    fab.current?.focus();
  };
  const close = () => {
    onClear?.(threadKey);
    setView('closed');
    status('idle');
    fab.current?.focus();
  };

  // ── Dragging (pointer: mouse, pen and touch) ──
  const startDrag = useCallback((e) => {
    if (e.button !== 0 || e.target.closest('button:not(.dock-grip):not(.dock-fab)')) return;
    const r = fab.current.getBoundingClientRect();
    drag.current = {
      sx: e.clientX,
      sy: e.clientY,
      ox: r.left,
      oy: r.top,
      moved: false,
      fromFab: e.currentTarget === fab.current,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, []);
  const moveDrag = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx,
      dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    if (!d.moved) {
      d.moved = true;
      setDragging(true);
    }
    setPos(clampTo({ x: d.ox + dx, y: d.oy + dy }, fabSize()));
  };
  const endDrag = (e) => {
    const d = drag.current;
    drag.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (!d?.moved) return;
    // The release after dragging the button must not also open / minimise the chat.
    if (d.fromFab) suppressClick.current = true;
    setDragging(false);
    setPos((p) => {
      store(p);
      return p;
    });
  };
  const dragHandlers = {
    onPointerDown: startDrag,
    onPointerMove: moveDrag,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  };

  // Keyboard: arrow keys on the grip move the assistant (Shift = bigger steps).
  const nudge = (e) => {
    const step = e.shiftKey ? 80 : 24;
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[
      e.key
    ];
    if (!delta) return;
    e.preventDefault();
    const r = fab.current.getBoundingClientRect();
    const next = clampTo({ x: r.left + delta[0], y: r.top + delta[1] }, fabSize());
    setPos(next);
    store(next);
  };
  const resetPosition = () => {
    setPos(null);
    store(null);
  };

  const { style: panelStyle, hintRight } = panelPlacement(pos, fabSize());
  const fabStyle = pos ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' } : undefined;
  const unread = view === 'minimized' ? Math.max(0, count - seen) : 0;

  return (
    <>
      {view !== 'closed' && (
        <section
          className={'dock-panel' + (dragging ? ' dragging' : '')}
          role="dialog"
          aria-label="SOMA assistant"
          ref={panel}
          hidden={!open}
          style={panelStyle}
        >
          <header {...dragHandlers}>
            <button
              className="dock-grip"
              aria-label="Move assistant. Use the arrow keys; double-click to reset its position."
              title="Drag to move · double-click to reset"
              onKeyDown={nudge}
              onDoubleClick={resetPosition}
            >
              <GripVertical size={16} />
            </button>
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
              aria-label="Minimise assistant (keeps the conversation)"
              title="Minimise · keeps the conversation"
              onClick={minimize}
            >
              <Minus size={18} />
            </button>
            <button
              className="icon-only"
              aria-label="Close assistant and clear the conversation"
              title="Close · clears the conversation"
              onClick={close}
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
              key={threadKey}
              compact
              paused={!open}
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
        ref={fab}
        className={
          'dock-fab mood-' +
          mood +
          (open ? ' open' : '') +
          (view === 'minimized' ? ' minimized' : '') +
          (dragging ? ' dragging' : '') +
          (hintRight ? ' hint-right' : '')
        }
        style={fabStyle}
        aria-label={
          open
            ? 'Minimise SOMA assistant'
            : view === 'minimized'
              ? `Restore SOMA assistant${unread ? ` (${unread} new)` : ''}`
              : 'Ask SOMA'
        }
        aria-expanded={open}
        {...dragHandlers}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          if (open) minimize();
          else {
            setView('open');
            status('listening');
          }
        }}
      >
        <SomaFace mood={mood} size={64} />
        {view === 'minimized' && (
          <span className={'dock-badge' + (unread ? ' new' : '')} aria-hidden="true">
            {unread || ''}
          </span>
        )}
        {view !== 'open' && !dragging && (
          <span className="dock-hint">{view === 'minimized' ? 'Resume chat' : 'Ask SOMA'}</span>
        )}
      </button>
    </>
  );
}
