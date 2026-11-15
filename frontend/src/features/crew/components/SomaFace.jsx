import React, { useEffect, useId, useRef, useState } from 'react';

// SOMA's assistant face: an original design (a glowing visor orb), not a third-party character.
// Moods: idle · listening · thinking · happy · concerned. Blinks, and its gaze follows the pointer.
// Respects prefers-reduced-motion and the in-app "Reduce motion" setting.
const reduced = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.classList.contains('a11y-reduce-motion'));

export default function SomaFace({ mood = 'idle', size = 64, follow = true, title }) {
  // Unique gradient/filter ids per instance: with fixed ids, a face inside a hidden panel
  // (display: none) would "own" the gradient and every other face would render blank.
  const uid = 'sf' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const ref = useRef(),
    [look, setLook] = useState({ x: 0, y: 0 }),
    [blink, setBlink] = useState(false);
  useEffect(() => {
    if (!follow || reduced()) return;
    let raf = 0;
    const move = (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        const dx = e.clientX - (r.left + r.width / 2),
          dy = e.clientY - (r.top + r.height / 2),
          d = Math.hypot(dx, dy) || 1,
          k = Math.min(1, d / 320);
        setLook({ x: (dx / d) * 6 * k, y: (dy / d) * 5 * k });
      });
    };
    window.addEventListener('pointermove', move);
    return () => {
      window.removeEventListener('pointermove', move);
      cancelAnimationFrame(raf);
    };
  }, [follow]);
  useEffect(() => {
    if (reduced()) return;
    let t;
    const loop = () => {
      t = setTimeout(
        () => {
          setBlink(true);
          setTimeout(() => setBlink(false), 140);
          loop();
        },
        2600 + Math.random() * 3200,
      );
    };
    loop();
    return () => clearTimeout(t);
  }, []);
  const gaze =
    mood === 'thinking' ? { x: 5, y: -6 } : mood === 'concerned' ? { x: look.x * 0.4, y: 2 } : look;
  const eyeH = blink ? 2 : mood === 'listening' ? 22 : mood === 'concerned' ? 14 : 18;
  return (
    <svg
      ref={ref}
      className={'soma-face mood-' + mood}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={title || `SOMA assistant, ${mood}`}
    >
      <defs>
        <radialGradient id={uid + '-orb'} cx="35%" cy="28%" r="80%">
          <stop offset="0" stopColor="#3fc4c9" />
          <stop offset=".55" stopColor="#0b7a84" />
          <stop offset="1" stopColor="#063f46" />
        </radialGradient>
        <radialGradient id={uid + '-visor'} cx="50%" cy="40%" r="70%">
          <stop offset="0" stopColor="#0c2e35" />
          <stop offset="1" stopColor="#051a1f" />
        </radialGradient>
        <filter id={uid + '-glow'} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="50" cy="50" r="48" fill={`url(#${uid}-orb)`} />
      <ellipse cx="38" cy="22" rx="20" ry="9" fill="#fff" opacity=".22" />
      <rect x="17" y="30" width="66" height="44" rx="22" fill={`url(#${uid}-visor)`} />
      <g
        className="sf-face"
        style={{ transform: `translate(${gaze.x}px, ${gaze.y}px)` }}
        filter={`url(#${uid}-glow)`}
      >
        {mood === 'happy' ? (
          <g
            className="sf-eyes"
            fill="none"
            stroke="#9ff3f2"
            strokeWidth="4.5"
            strokeLinecap="round"
          >
            <path d="M33 51 q6 -9 12 0" />
            <path d="M55 51 q6 -9 12 0" />
          </g>
        ) : (
          <g className="sf-eyes" fill="#9ff3f2">
            <rect x="34" y={50 - eyeH / 2} width="10" height={eyeH} rx="5" />
            <rect x="56" y={50 - eyeH / 2} width="10" height={eyeH} rx="5" />
          </g>
        )}
        {mood === 'concerned' && (
          <g stroke="#9ff3f2" strokeWidth="3" strokeLinecap="round">
            <path d="M32 38 l11 4" />
            <path d="M68 38 l-11 4" />
          </g>
        )}
        <path
          className="sf-mouth"
          fill="none"
          stroke="#9ff3f2"
          strokeWidth="3"
          strokeLinecap="round"
          d={
            mood === 'happy'
              ? 'M42 63 q8 7 16 0'
              : mood === 'concerned'
                ? 'M43 65 q7 -4 14 0'
                : mood === 'thinking'
                  ? 'M47 64 h6'
                  : 'M44 63 q6 4 12 0'
          }
        />
      </g>
      {mood === 'thinking' && (
        <g className="sf-orbit">
          <circle cx="50" cy="6" r="3.2" fill="#9ff3f2" />
          <circle
            cx="50"
            cy="6"
            r="2.4"
            fill="#9ff3f2"
            opacity=".6"
            transform="rotate(-40 50 50)"
          />
          <circle
            cx="50"
            cy="6"
            r="1.8"
            fill="#9ff3f2"
            opacity=".35"
            transform="rotate(-80 50 50)"
          />
        </g>
      )}
    </svg>
  );
}
