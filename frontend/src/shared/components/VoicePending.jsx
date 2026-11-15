import React from 'react';

/**
 * Shown for a moment after a spoken question, before it is sent automatically: a draining bar
 * plus Edit (turn it into typed text) and Cancel. Pair it with `useSpeechInput`.
 */
export default function VoicePending({ voice, onEdit }) {
  if (!voice.pending) return null;
  const seconds = Math.round(voice.sendDelay / 1000);
  return (
    <div className="voice-pending" role="status">
      <span
        className="voice-pending-bar"
        style={{ animationDuration: voice.sendDelay + 'ms' }}
        aria-hidden="true"
      />
      <span className="voice-pending-text">Sending in {seconds} s…</span>
      <button type="button" onClick={() => onEdit(voice.discard())}>
        Edit
      </button>
      <button type="button" onClick={() => voice.discard()}>
        Cancel
      </button>
      <button type="button" className="primary" onClick={voice.confirm}>
        Send now
      </button>
    </div>
  );
}
