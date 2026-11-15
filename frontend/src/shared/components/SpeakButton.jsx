import React from 'react';
import { Square, Volume2 } from 'lucide-react';

/** "Listen" / "Stop" control on an assistant message. Pair it with `useSpeechOutput`. */
export default function SpeakButton({ tts, id, text }) {
  if (!tts.supported || !text) return null;
  const speaking = tts.speakingId === id;
  return (
    <button
      type="button"
      className={'speak-button' + (speaking ? ' speaking' : '')}
      onClick={() => tts.toggle(id, text)}
      aria-pressed={speaking}
      aria-label={speaking ? 'Stop reading aloud' : 'Read this answer aloud'}
      title={speaking ? 'Stop' : 'Listen'}
    >
      {speaking ? (
        <>
          <Square size={10} fill="currentColor" />
          <span className="speak-bars" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </>
      ) : (
        <Volume2 size={14} />
      )}
    </button>
  );
}
