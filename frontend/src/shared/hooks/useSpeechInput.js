import { useCallback, useEffect, useRef, useState } from 'react';

// Voice input for the chats, using the browser's built-in Web Speech API: free, no API key, no
// dependency. Supported in Chrome, Edge and Safari (not Firefox; the mic button is then hidden).
// Note: Chrome and Edge send the audio to their speech service to transcribe it; Safari uses Apple's
// speech service. Nothing is recorded or stored by SOMA.

const Recognition =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export const speechSupported = Boolean(Recognition);

function errorMessage(code) {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return typeof window !== 'undefined' && !window.isSecureContext
        ? 'Voice input needs a secure (https) connection.'
        : 'Microphone access is blocked. Allow it in your browser settings.';
    case 'audio-capture':
      return 'No microphone was found.';
    case 'network':
      return 'Voice input needs an internet connection in this browser.';
    case 'no-speech':
      return 'I didn’t hear anything. Tap the microphone and try again.';
    case 'language-not-supported':
      return 'Voice input is not available for this language.';
    default:
      return 'Voice input stopped unexpectedly. Try again.';
  }
}

export const AUTO_SEND_MS = 1000;

/**
 * Speak a message instead of typing it.
 * While listening, `transcript` holds the live words so the input can show them. When the person
 * stops talking, the text waits in `pending` for `sendDelay` ms (time to read, edit or cancel it)
 * and then `onResult(text)` runs. `confirm()` sends it at once, `discard()` drops it and returns it.
 * `stop({ now: true })` ends listening and sends straight away (the Send button).
 */
export function useSpeechInput({ onResult, lang = 'en-US', sendDelay = AUTO_SEND_MS } = {}) {
  const [listening, setListening] = useState(false),
    [transcript, setTranscript] = useState(''),
    [pending, setPending] = useState(''),
    [error, setError] = useState('');
  const rec = useRef(null),
    heard = useRef({ final: '', all: '' }),
    sendNow = useRef(false),
    pendingText = useRef(''),
    pendingTimer = useRef(),
    resultRef = useRef(onResult);
  resultRef.current = onResult;

  const clearPending = useCallback(() => {
    clearTimeout(pendingTimer.current);
    const text = pendingText.current;
    pendingText.current = '';
    setPending('');
    return text;
  }, []);
  /** Send the waiting transcript now. */
  const confirm = useCallback(() => {
    const text = clearPending();
    if (text) resultRef.current?.(text);
  }, [clearPending]);
  /** Drop the waiting transcript (returns it, e.g. to edit it as typed text). */
  const discard = clearPending;

  /** Stop listening and discard what was heard (and anything waiting to be sent). */
  const cancel = useCallback(() => {
    clearPending();
    const r = rec.current;
    rec.current = null;
    if (r) {
      r.onresult = r.onerror = r.onend = null;
      r.abort();
    }
    setListening(false);
    setTranscript('');
  }, [clearPending]);

  /** Stop listening. What was heard waits `sendDelay` ms, or is sent at once with `{ now: true }`. */
  const stop = useCallback(({ now = false } = {}) => {
    if (!rec.current) return;
    sendNow.current = now;
    rec.current.stop();
  }, []);

  const start = useCallback(() => {
    if (!Recognition || rec.current) return;
    const r = new Recognition();
    r.lang = lang;
    r.interimResults = true; // live words while speaking
    r.continuous = false; // one question per tap; ends after a natural pause
    r.maxAlternatives = 1;
    clearPending();
    heard.current = { final: '', all: '' };
    sendNow.current = false;
    setError('');
    setTranscript('');

    r.onresult = (e) => {
      let final = '',
        partial = '';
      for (const result of e.results) {
        if (result.isFinal) final += result[0].transcript;
        else partial += result[0].transcript;
      }
      heard.current = { final: final.trim(), all: (final + partial).trim() };
      setTranscript(heard.current.all);
    };
    r.onerror = (e) => {
      if (e.error !== 'aborted') setError(errorMessage(e.error));
    };
    r.onend = () => {
      rec.current = null;
      setListening(false);
      setTranscript('');
      // If stopped mid-word some browsers never finalise: fall back to the last words shown.
      const text = heard.current.final || heard.current.all;
      if (!text) return;
      if (sendNow.current || sendDelay <= 0) {
        resultRef.current?.(text);
        return;
      }
      pendingText.current = text;
      setPending(text);
      pendingTimer.current = setTimeout(confirm, sendDelay);
    };

    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      rec.current = null;
      setError(errorMessage());
    }
  }, [lang, sendDelay, clearPending, confirm]);

  const toggle = useCallback(() => (rec.current ? stop() : start()), [start, stop]);

  // Errors disappear on their own after a few seconds.
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 6000);
    return () => clearTimeout(t);
  }, [error]);

  // Never leave the microphone on when the chat goes away.
  useEffect(() => cancel, [cancel]);

  return {
    supported: speechSupported,
    listening,
    transcript,
    pending,
    sendDelay,
    error,
    start,
    stop,
    cancel,
    toggle,
    confirm,
    discard,
  };
}
