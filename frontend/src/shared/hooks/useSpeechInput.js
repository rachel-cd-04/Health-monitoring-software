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

// The browser's own end-of-speech detection stops at the first short pause (often mid-sentence). We
// listen continuously instead and stop ourselves after this much silence.
export const SILENCE_MS = 1250;
// Give up if nothing at all is said within this time after tapping the microphone.
export const NO_SPEECH_MS = 8000;

/**
 * Speak a message instead of typing it.
 * While listening, `transcript` holds the live words so the input can show them. Listening ends after
 * `silenceMs` without new words (or when `stop()` is called) and `onResult(text)` runs straight away.
 */
export function useSpeechInput({ onResult, lang = 'en-US', silenceMs = SILENCE_MS } = {}) {
  const [listening, setListening] = useState(false),
    [transcript, setTranscript] = useState(''),
    [error, setError] = useState('');
  const rec = useRef(null),
    heard = useRef({ final: '', all: '' }),
    silenceTimer = useRef(),
    resultRef = useRef(onResult);
  resultRef.current = onResult;

  /** Stop listening and send what was heard so far. */
  const stop = useCallback(() => {
    clearTimeout(silenceTimer.current);
    rec.current?.stop();
  }, []);

  /** Stop listening and discard what was heard. */
  const cancel = useCallback(() => {
    clearTimeout(silenceTimer.current);
    const r = rec.current;
    rec.current = null;
    if (r) {
      r.onresult = r.onerror = r.onend = null;
      r.abort();
    }
    setListening(false);
    setTranscript('');
  }, []);

  const start = useCallback(() => {
    if (!Recognition || rec.current) return;
    const r = new Recognition();
    r.lang = lang;
    r.interimResults = true; // live words while speaking
    r.continuous = true; // keep listening through short pauses; the silence timer ends it
    r.maxAlternatives = 1;
    heard.current = { final: '', all: '' };
    setError('');
    setTranscript('');

    // Nothing said at all: stop and say so.
    silenceTimer.current = setTimeout(() => {
      setError(errorMessage('no-speech'));
      rec.current?.stop();
    }, NO_SPEECH_MS);

    r.onresult = (e) => {
      let final = '',
        partial = '';
      for (const result of e.results) {
        if (result.isFinal) final += result[0].transcript;
        else partial += result[0].transcript;
      }
      heard.current = { final: final.trim(), all: (final + partial).trim() };
      setTranscript(heard.current.all);
      // Every new word restarts the countdown; it only runs out after a real pause.
      clearTimeout(silenceTimer.current);
      silenceTimer.current = setTimeout(() => rec.current?.stop(), silenceMs);
    };
    r.onerror = (e) => {
      if (e.error !== 'aborted') setError(errorMessage(e.error));
    };
    r.onend = () => {
      clearTimeout(silenceTimer.current);
      rec.current = null;
      setListening(false);
      setTranscript('');
      // If stopped mid-word some browsers never finalise: fall back to the last words shown.
      const text = heard.current.final || heard.current.all;
      if (text) resultRef.current?.(text);
    };

    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      clearTimeout(silenceTimer.current);
      rec.current = null;
      setError(errorMessage());
    }
  }, [lang, silenceMs]);

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
    error,
    start,
    stop,
    cancel,
    toggle,
  };
}
