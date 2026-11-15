import React from 'react';
import { Mic, Square } from 'lucide-react';

/** Microphone toggle for the chat inputs. Pair it with `useSpeechInput`. */
export default function MicButton({ voice, disabled, className = '' }) {
  if (!voice.supported) return null;
  return (
    <button
      type="button"
      className={'mic-button' + (voice.listening ? ' listening' : '') + (className ? ' ' + className : '')}
      onClick={voice.toggle}
      disabled={disabled && !voice.listening}
      aria-pressed={voice.listening}
      aria-label={voice.listening ? 'Stop listening' : 'Ask by voice'}
      title={voice.listening ? 'Stop listening' : 'Ask by voice'}
    >
      {voice.listening ? <Square size={14} fill="currentColor" /> : <Mic size={18} />}
    </button>
  );
}
