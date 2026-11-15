import { latest, metrics, stamp, valueLabel, checkIn } from '../../crew/models/crewModel.js';

export function routineReply(input, person, data) {
  const text = input.toLowerCase();
  if (
    /not breathing|unresponsive|chest pain|cannot breathe|can't breathe|severe bleeding|no responde|no respira/.test(
      text,
    )
  )
    return {
      text: 'This may need immediate assistance. Alert the crew and CMO now and use the mission emergency procedure. Do not wait for this demo chat or a reply from Earth.',
      action: 'emergency',
    };
  if (/next|schedule|morning|evening|check.in/.test(text)) {
    if (checkIn(data, person.id, 'daily'))
      return {
        text: `${person.name} has completed today’s check-in. The next one is tomorrow at ${data.schedule.daily} UTC. Saved history remains available.`,
        action: 'station',
      };
    return {
      text: `${person.name} has one check-in per day, scheduled at ${data.schedule.daily} UTC, and today’s is still open. Open the station to record all eight indicators.`,
      action: 'station',
    };
  }
  if (/measure|checklist|manual|protocol|station/.test(text))
    return {
      text: 'At the station, confirm the person and setup once. Enter four instrument readings (heart rate, blood pressure, blood sugar, temperature) or try the short demo capture, then confirm that the completed values match the instruments. Report hours slept, mood, fatigue and exercise minutes, review the eight indicators and complete the check-in. Times are recorded automatically; notes and time adjustments are optional. Follow the approved instrument and mission procedure.',
      action: 'station',
    };
  if (/stomach|tummy|belly|abdomen|abdominal|tripa|barriga|est[oó]mago|nause|vomit/.test(text))
    return {
      text: 'Stomach pain is a symptom to share with the CMO today. Note where it hurts, when it began, how intense it is (1–10) and whether it is changing, and add it to the note of your next check-in. Tell the crew straight away if the pain is severe, sudden, keeps getting worse, or comes with fever, vomiting or blood. This scripted demo cannot identify a cause or give a diagnosis.',
    };
  if (
    /latest|reading|result|data|heart|pressure|sugar|glucose|temperature|sleep|exercise|fatigue/.test(
      text,
    )
  ) {
    const rows = Object.entries(metrics).map(([key, m]) => {
      const r = latest(data.records, person.id, key);
      return r
        ? `${m.label}: ${valueLabel(r)} ${m.unit} — recorded ${stamp(r.time)}.`
        : `${m.label}: no saved sample.`;
    });
    return {
      text: `Saved information for ${person.name}:
${rows.join('\n')}
These are historical samples. They do not show the person’s current condition or confirm that they are well.`,
    };
  }
  if (/pain|knee|dizzy|headache|symptom|hurt|tired|duele|mareo/.test(text))
    return {
      text: 'Note where the symptom is, when it began, how intense it feels and whether it is changing, and add it to the note of your next check-in. Share new, persistent or worsening symptoms with the CMO. For an urgent change, use the crew alert. This scripted demo cannot identify a cause or give a diagnosis.',
    };
  return {
    text: 'I can show this person’s saved readings, explain the daily check-in, or walk through the measurement checklist. For a symptom question, record location, onset and changes for the CMO. This placeholder has no AI model connected, so it cannot assess other questions. Your message is retained in this person’s chat.',
  };
}
export function emergencyReply(input, current = {}) {
  const text = input.toLowerCase();
  const next = { ...current };
  if (/not responsive|unresponsive|not responding|no responde/.test(text)) next.responsive = 'no';
  else if (/they are responsive|person is responsive|awake|responds/.test(text))
    next.responsive = 'yes';
  else if (/responsiveness is unclear/.test(text)) next.responsive = 'unknown';
  if (
    /not breathing normally|not breathing|gasping|cannot breathe|can't breathe|no respira/.test(
      text,
    )
  )
    next.breathing = 'no';
  else if (/breathing normally|breathing is normal/.test(text)) next.breathing = 'yes';
  else if (/breathing is unclear/.test(text)) next.breathing = 'unknown';
  if (/started just now/.test(text)) next.onset = 'Just now';
  else if (/started earlier/.test(text)) next.onset = 'Earlier — exact time to be documented';
  const urgent = next.responsive === 'no' || next.breathing === 'no';
  let response = urgent
    ? 'Get the CMO and trained crew immediately. Activate the mission-approved emergency / basic life support procedure and bring the equipment required by that procedure. Do not wait for chat or Earth communications. '
    : next.responsive === 'unknown' || next.breathing === 'unknown'
      ? 'Get the CMO to assess the person immediately; an uncertain response is not a reassuring finding. '
      : 'Keep the CMO involved, document changes and follow the mission procedure. The chat does not decide whether the person is clinically stable. ';
  if (!next.responsive) response += 'Is the person responsive?';
  else if (!next.breathing) response += 'Is the person breathing normally?';
  else if (!next.onset) response += 'When did this start?';
  else
    response +=
      'Record what has changed and what has already been done. Prepare a factual handover with onset, responsiveness, breathing and any acquired measurements. Saved routine values may be old.';
  return { text: response, assessment: next };
}
export function emergencyPrompts(assessment = {}) {
  if (!assessment.responsive)
    return ['They are responsive', 'They are not responsive', 'Responsiveness is unclear'];
  if (!assessment.breathing)
    return ['Breathing normally', 'Not breathing normally', 'Breathing is unclear'];
  if (!assessment.onset) return ['Started just now', 'Started earlier'];
  return ['Summarise the next coordination steps', 'What information should I record?'];
}
