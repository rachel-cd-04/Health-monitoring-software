import { useCallback, useEffect, useRef, useState } from 'react';

// Read assistant replies aloud with the browser's built-in speechSynthesis: free, no API key, works
// offline with the voices installed on the device (Chrome, Edge, Safari and Firefox).

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
export const ttsSupported = Boolean(synth && typeof window.SpeechSynthesisUtterance === 'function');

/** Markdown → plain sentences, so the voice doesn't read "asterisk" or "[1]". */
export function speakable(markdown) {
  return String(markdown ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1')
    .replace(/\[\d+\]/g, '')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(^|[^\w*])\*(?=\S)([^*\n]+?)\*(?!\*)/g, '$1$2')
    .replace(/(^|[^\w_])_(?=\S)([^_\n]+?)_(?![\w_])/g, '$1$2')
    .split('\n')
    .map((line) =>
      line
        .replace(/^\s*#{1,6}\s+/, '')
        .replace(/^\s*>\s?/, '')
        .replace(/^\s*[-*+•]\s+/, '')
        .replace(/^\s*([-*_])(\s*\1){2,}\s*$/, '')
        .trim(),
    )
    .filter(Boolean)
    // Each line (heading, list item) becomes its own sentence so the voice pauses between them.
    .map((line) => (/[.!?:;]$/.test(line) ? line : line + '.'))
    .join(' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Short utterances: Chrome stops long ones after ~15 s, and short ones can be stopped sooner. */
function chunks(text, max = 220) {
  const sentences = text.match(/[^.!?;:]+[.!?;:]+["')\]]*\s*|[^.!?;:]+$/g) || [];
  const out = [];
  let current = '';
  for (const sentence of sentences) {
    if ((current + sentence).length > max && current) {
      out.push(current.trim());
      current = '';
    }
    current += sentence;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

/** Prefer natural-sounding voices for the language when the device has them. */
function pickVoice(lang) {
  const voices = synth.getVoices();
  const norm = (l) => String(l || '').replace('_', '-').toLowerCase();
  const sameLang = voices.filter((v) => norm(v.lang).startsWith(norm(lang).split('-')[0]));
  const exact = sameLang.filter((v) => norm(v.lang) === norm(lang));
  const pool = exact.length ? exact : sameLang;
  for (const re of [/natural|neural|premium|enhanced/i, /google/i, /samantha|ava|allison|aria|jenny/i]) {
    const voice = pool.find((v) => re.test(v.name));
    if (voice) return voice;
  }
  return pool.find((v) => v.localService) || pool[0] || null;
}

// Some browsers load the voice list asynchronously: ask once early so it is ready on first use.
if (ttsSupported) {
  synth.getVoices();
  synth.addEventListener?.('voiceschanged', () => synth.getVoices());
}

/**
 * `speak(id, text)` reads a message aloud (stopping anything else), `stop()` stops it, and
 * `speakingId` tells which message is being read so its button can show "Stop".
 */
export function useSpeechOutput({ lang = 'en-US', rate = 1 } = {}) {
  const [speakingId, setSpeakingId] = useState(null);
  const session = useRef(0),
    active = useRef(false);

  const stop = useCallback(() => {
    session.current += 1;
    if (active.current) synth?.cancel();
    active.current = false;
    setSpeakingId(null);
  }, []);

  const speak = useCallback(
    (id, text) => {
      if (!ttsSupported) return;
      const parts = chunks(speakable(text));
      if (!parts.length) return;
      synth.cancel();
      const mine = ++session.current;
      const done = () => {
        if (session.current !== mine) return;
        active.current = false;
        setSpeakingId(null);
      };
      const voice = pickVoice(lang);
      parts.forEach((part, i) => {
        const u = new SpeechSynthesisUtterance(part);
        u.lang = voice?.lang || lang;
        if (voice) u.voice = voice;
        u.rate = rate;
        u.onerror = done; // also fires when another message interrupts this one
        if (i === parts.length - 1) u.onend = done;
        synth.speak(u);
      });
      active.current = true;
      setSpeakingId(id);
    },
    [lang, rate],
  );

  const toggle = useCallback(
    (id, text) => (speakingId === id ? stop() : speak(id, text)),
    [speakingId, speak, stop],
  );

  // Closing the chat stops its voice.
  useEffect(() => stop, [stop]);

  return { supported: ttsSupported, speakingId, speak, stop, toggle };
}
