// Emergency guide (F5) — one step per screen. Generic first-aid level and ILLUSTRATIVE for the demo:
// it never replaces the mission medical procedure or the flight surgeon. Pure data + helpers so the
// tree can be tested and later replaced by the backend's static JSON.

export const scenarios = [
  { id: 'chest', label: 'Chest pain', situation: 'Severe pain or discomfort' },
  { id: 'collapse', label: 'Collapsed or unresponsive', situation: 'Not responding' },
  { id: 'breathing', label: 'Breathing problem', situation: 'Breathing difficulty' },
  { id: 'bleeding', label: 'Bleeding or injury', situation: 'Injury' },
  { id: 'other', label: 'Something else', situation: 'Unsure — assistance needed' },
];

const scenarioAction = {
  chest: {
    title: 'Stop activity and call the CMO',
    items: [
      'Help the person stop, rest and stay secured.',
      'Call the CMO now and bring the medical kit.',
      'Note when the pain started and how it feels.',
    ],
  },
  breathing: {
    title: 'Help them breathe and call the CMO',
    items: [
      'Check cabin atmosphere and alarms.',
      'Help the person rest in a comfortable, secured position.',
      'Call the CMO. Use oxygen only as your procedure says.',
    ],
  },
  bleeding: {
    title: 'Control the bleeding and call the CMO',
    items: [
      'Put on gloves from the medical kit.',
      'Apply firm, steady pressure with a dressing.',
      'Call the CMO and keep pressure until they take over.',
    ],
  },
  other: {
    title: 'Stay with them and call the CMO',
    items: [
      'Keep the person secured and calm.',
      'Call the CMO and describe what you see.',
      'Watch for changes in responsiveness or breathing.',
    ],
  },
  collapse: {
    title: 'Stay with them and call the CMO',
    items: [
      'Keep the person secured.',
      'Call the CMO and bring the medical kit.',
      'Keep checking responsiveness and breathing.',
    ],
  },
};

/** Node shapes: question {id, kind:'question', text(name), options:[{value,label,next}]}, action {kind:'action', title, items, next} */
export function node(id, ctx) {
  const name = ctx.name || 'the person';
  switch (id) {
    case 'responsive':
      return {
        id,
        kind: 'question',
        field: 'responsive',
        text: `Is ${name} responsive?`,
        hint: 'Speak to them and gently tap their shoulder.',
        options: [
          { value: 'yes', label: 'Yes', next: 'scenario-action' },
          { value: 'no', label: 'No', next: 'breathing' },
          { value: 'unknown', label: 'Not sure', next: 'breathing' },
        ],
      };
    case 'breathing':
      return {
        id,
        kind: 'question',
        field: 'breathing',
        text: `Is ${name} breathing normally?`,
        hint: 'Look, listen and feel for up to 10 seconds.',
        options: [
          { value: 'yes', label: 'Yes', next: 'recovery' },
          { value: 'no', label: 'No', next: 'bls' },
          { value: 'unknown', label: 'Not sure', next: 'bls' },
        ],
      };
    case 'bls':
      return {
        id,
        kind: 'action',
        urgent: true,
        title: 'Start basic life support now',
        items: [
          'Call the CMO and the whole crew immediately.',
          'Start the mission CPR / basic life support procedure.',
          'Bring the medical kit and the AED as your procedure requires.',
          'Do not wait for Earth. Keep going until the CMO takes over.',
        ],
        next: 'vitals',
      };
    case 'recovery':
      return {
        id,
        kind: 'action',
        urgent: true,
        title: 'Protect the airway and call the CMO',
        items: [
          'Call the CMO now.',
          'Place the person in the recovery position your procedure describes.',
          'Keep checking their breathing until help arrives.',
        ],
        next: 'vitals',
      };
    case 'scenario-action':
      return { id, kind: 'action', ...scenarioAction[ctx.scenario || 'other'], next: 'onset' };
    case 'onset':
      return {
        id,
        kind: 'question',
        field: 'onset',
        text: 'When did it start?',
        options: [
          { value: 'Just now', label: 'Just now', next: 'vitals' },
          { value: 'Earlier', label: 'Earlier', next: 'vitals' },
          { value: 'Unknown', label: 'Not sure', next: 'vitals' },
        ],
      };
    case 'vitals':
      return {
        id,
        kind: 'vitals',
        text: 'Take vitals if you can',
        hint: 'Only if it does not delay care. Skip otherwise.',
        next: 'summary',
      };
    case 'summary':
      return { id, kind: 'summary' };
    default:
      return null;
  }
}

export const FIRST_STEP = 'responsive';

/** Every path through the tree ends at the summary. */
export function paths(scenario = 'chest') {
  const out = [];
  const walk = (id, trail) => {
    const n = node(id, { scenario });
    if (!n || n.kind === 'summary') {
      out.push([...trail, 'summary']);
      return;
    }
    if (n.kind === 'question')
      n.options.forEach((o) => walk(o.next, [...trail, id + ':' + o.value]));
    else walk(n.next, [...trail, id]);
  };
  walk(FIRST_STEP, []);
  return out;
}

/** Plain-text summary for the crew and the ground team. */
export function summaryText(incident, personName, stampFn) {
  const lines = [
    `On-board emergency (illustrative guide): ${incident.situation}`,
    `Person: ${personName}`,
    `Started: ${stampFn(incident.createdAt)}`,
    `Responsive: ${incident.assessment?.responsive || 'not assessed'} · Normal breathing: ${incident.assessment?.breathing || 'not assessed'} · Onset: ${incident.assessment?.onset || 'not recorded'}`,
  ];
  if (incident.vitals?.length)
    lines.push(
      'Vitals taken: ' +
        incident.vitals
          .map((v) => `${v.label} ${v.value} ${v.unit} at ${stampFn(v.ts)}`)
          .join('; '),
    );
  if (incident.log?.length)
    lines.push('Steps:\n' + incident.log.map((l) => `- ${stampFn(l.ts)} · ${l.text}`).join('\n'));
  return lines.join('\n');
}
