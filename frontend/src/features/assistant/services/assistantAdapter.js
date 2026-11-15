// Assistant adapter — the single seam between the chat UI and any language-model backend.
//
// Default engine: 'scripted' (deterministic replies from assistantLogic.js, no model, works offline).
// Optional engine: 'service' — set window.SOMA_CONFIG = {assistantEndpoint:'https://…'} before the app
// loads, or VITE_SOMA_ASSISTANT_URL at build time. The backend owns the model (e.g. Mistral + RAG) and
// its API key; the frontend never holds provider credentials.
//
// Request  POST {endpoint}  {message, thread, context}
// Response {answer:string, sources:[{title,url}|riskId], caution?:string, dataUsed?:string[], ruleIds?:string[], action?:'station'|'emergency'}
// Any network/validation failure falls back to the scripted engine and is labelled as such.
// Emergency threads never use this adapter: they stay on the deterministic guide (emergencyReply).
import { routineReply, offlineEmergencyReply } from '../models/assistantLogic.js';
import { evaluateSignals } from '../../alerts/models/rules.js';
import { risks } from '../../health/models/risks.js';
import { latest, metrics, metricOrder, valueLabel } from '../../crew/models/crewModel.js';
import { api, apiConfigured } from '../../../shared/api/apiClient.js';

export function assistantEndpoint() {
  try {
    if (typeof window !== 'undefined' && window.SOMA_CONFIG?.assistantEndpoint)
      return window.SOMA_CONFIG.assistantEndpoint;
  } catch {
    // Ignore an unavailable window config and try the build-time setting.
  }
  try {
    return import.meta.env?.VITE_SOMA_ASSISTANT_URL || null;
  } catch {
    return null;
  }
}
export const assistantMode = () => (apiConfigured || assistantEndpoint() ? 'service' : 'scripted');

const CAUTION =
  'SOMA explains saved records and documentation. It does not diagnose or recommend treatment. For new, persistent or worsening symptoms, involve the CMO.';
const topics = [
  [/sleep|tired|fatigue|rest|insomnia/, 'sleep'],
  [/heart|pulse|pressure|cardio/, 'cardiovascular'],
  [/sugar|glucose|nutrition|food|diet|meal/, 'nutrition'],
  [/mood|stress|wellbeing|lonely|isolat|anxious|sad/, 'behavioral'],
  [/radiation|dose|solar|neutron/, 'radiation'],
  [/temperature|fever|infection|immune/, 'immune'],
  [/cabin|co2|air/, 'habitat'],
  [/exercise|fitness|muscle|workout/, 'fitness'],
  [/bone|joint/, 'bone'],
  [/earth|ground|delay|signal|link/, 'distance'],
];

/** Context sent to a backend: minimal, pseudonymous, already computed by the rules engine. */
export function buildContext(person, data, now = Date.now()) {
  const signals = evaluateSignals(data, person.id, now);
  return {
    crewRef: person.id,
    role: person.role,
    schedule: data.schedule,
    latest: Object.fromEntries(
      metricOrder.map((k) => {
        const r = latest(data.records, person.id, k);
        return [
          k,
          r
            ? {
                value: r.value,
                diastolic: r.diastolic,
                unit: metrics[k].unit,
                time: r.time,
                source: r.source,
              }
            : null,
        ];
      }),
    ),
    signals: signals.map(
      ({ ruleId, ruleVersion, level, severity, whoActs, title, reason, metric, riskIds }) => ({
        ruleId,
        ruleVersion,
        level,
        severity,
        whoActs,
        title,
        reason,
        metric,
        riskIds,
      }),
    ),
  };
}

function explainSignals(person, data, now) {
  const signals = evaluateSignals(data, person.id, now);
  if (!signals.length)
    return {
      text: `No trends are flagged for ${person.name}. The spec rules (S-01, M-01, C-01, C-02, G-01, T-01, E-01) check the saved daily check-ins. No flag does not confirm good health. It only means no rule threshold was met.`,
      sources: ['nasa-risks'],
      dataUsed: ['Rules engine · ruleset spec-1.0'],
      ruleIds: [],
    };
  const lines = signals.map(
    (s) =>
      `• ${s.ruleId} (${s.severity === 'red' ? 'red' : s.severity === 'amber' ? 'amber' : 'info'}) — ${s.title}. ${s.reason}`,
  );
  return {
    text: `Rules flagged ${signals.length === 1 ? 'one item' : signals.length + ' items'} for ${person.name}:\n${lines.join('\n')}\nThese are illustrative thresholds, not a diagnosis. Red items need the crew now; amber items are for the person to follow up, with the CMO if they persist. If anything feels worse, tell the CMO.`,
    sources: [...new Set(signals.flatMap((s) => s.riskIds))],
    dataUsed: signals
      .filter((s) => s.baseline)
      .map(
        (s) =>
          `${metrics[s.metric].label}: ${s.baseline.n} saved samples (${s.baseline.days}-day baseline)`,
      ),
    ruleIds: signals.map((s) => s.ruleId),
  };
}

export function scriptedReply(message, person, data, now = Date.now()) {
  const text = message.toLowerCase();
  let reply;
  if (person.general) {
    if (
      /not breathing|unresponsive|collapsed|chest pain|cannot breathe|can't breathe|bleeding|emergency|no respira/.test(
        text,
      )
    )
      return {
        text: 'Open Emergency now: the red button is on every screen and needs no code. It guides you one step at a time and alerts the crew. Call the CMO and follow the mission procedure.',
        action: 'emergency',
        sources: [],
        dataUsed: [],
        caution: null,
        engine: 'scripted',
      };
    const hit = topics.find(([re]) => re.test(text));
    if (hit && /why|what|track|matter|risk|explain/.test(text)) {
      const r = risks[hit[1]];
      return {
        text: `${r.org} context — ${r.title}: ${r.summary}\nHow SOMA uses it: ${r.soma}\nLimits: ${r.limits}`,
        sources: [hit[1]],
        dataUsed: [],
        caution: CAUTION,
        engine: 'scripted',
      };
    }
    if (/check.?in|schedule|routine|daily/.test(text))
      return {
        text: `Each crew member does one check-in per day at ${data.schedule.daily} UTC: four instrument readings (heart rate, blood pressure, blood sugar, temperature) and four self-reports (sleep, mood, fatigue, exercise). It takes about a minute at the station. Reminders appear under the bell.`,
        sources: ['nasa-research'],
        dataUsed: [],
        caution: null,
        engine: 'scripted',
      };
    if (/code|pin|private|privacy|unlock/.test(text))
      return {
        text: 'The shared screen only shows general status. Each person signs in with their own profile PIN to open their private data. Emergencies never need a PIN.',
        sources: [],
        dataUsed: [],
        caution: null,
        engine: 'scripted',
      };
    if (/latest|reading|my |trend|result|data/.test(text))
      return {
        text: 'That needs personal data. Open the person’s profile with their code first, then ask me again there.',
        sources: [],
        dataUsed: [],
        caution: null,
        engine: 'scripted',
      };
    return {
      text: 'I can explain why SOMA tracks each indicator, how the daily check-in works, how privacy works and how to get help fast. Personal readings need that person’s code.',
      sources: ['nasa-risks'],
      dataUsed: [],
      caution: null,
      engine: 'scripted',
    };
  }
  if (
    /trend|alert|signal|flag|why.*(warning|flag)|explain my/.test(text) &&
    !/not breathing|unresponsive|chest pain/.test(text)
  )
    reply = explainSignals(person, data, now);
  else if (
    /why (does|do|is) .*(track|monitor|record|measur)|why.*matter/.test(text) &&
    topics.some(([re]) => re.test(text))
  ) {
    const id = topics.find(([re]) => re.test(text))[1],
      r = risks[id];
    reply = {
      text: `${r.org} context — ${r.title}: ${r.summary}\nHow SOMA uses it: ${r.soma}\nLimits: ${r.limits}`,
      sources: [id],
      dataUsed: [],
    };
  } else {
    const base = routineReply(message, person, data);
    reply = { ...base, sources: [], dataUsed: [] };
    if (/latest|reading|result|data/.test(text))
      reply.dataUsed = metricOrder
        .map((k) => {
          const r = latest(data.records, person.id, k);
          return r ? `${metrics[k].label} ${valueLabel(r)} ${metrics[k].unit}` : null;
        })
        .filter(Boolean);
    const hit = topics.filter(([re]) => re.test(text)).map(([, id]) => id);
    reply.sources = [...new Set(hit)];
    if (/what does|why.*track|matter|risk/.test(text) && !reply.sources.length)
      reply.sources = ['nasa-risks'];
  }
  return { ...reply, caution: reply.action === 'emergency' ? null : CAUTION, engine: 'scripted' };
}

const valid = (r) =>
  r && typeof r.answer === 'string' && r.answer.trim() && (!r.sources || Array.isArray(r.sources));

export async function askAssistant({
  message,
  person,
  data,
  thread,
  now = Date.now(),
  fetchImpl = globalThis.fetch,
  timeoutMs = 65000,
}) {
  if (apiConfigured) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const body = await api('/api/assistant/chat', {
        method: 'POST',
        body: { message },
        signal: ctrl.signal,
      });
      if (typeof body?.answer !== 'string' || !body.answer.trim())
        throw new Error('Invalid response shape');
      return {
        text: body.answer,
        sources: body.sources || [],
        caution: body.caution || CAUTION,
        // `data_used` lists internal tool names (e.g. get_crew_member_health_summary): not for the crew.
        // The answer's references are shown from `sources` instead.
        dataUsed: [],
        ruleIds: [],
        engine: 'service',
        scope: body.scope,
      };
    } catch (error) {
      return {
        text: 'The mission assistant is unavailable right now. Your saved health data and emergency tools are still available.',
        sources: [],
        dataUsed: [],
        caution: null,
        engine: 'unavailable',
        unavailable: true,
        fallbackReason: String(error.message || error),
      };
    } finally {
      clearTimeout(timer);
    }
  }
  const endpoint = assistantEndpoint();
  if (!endpoint || person.general) return scriptedReply(message, person, data, now);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, thread, context: buildContext(person, data, now) }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const body = await res.json();
    if (!valid(body)) throw new Error('Invalid response shape');
    return {
      text: body.answer,
      sources: body.sources || [],
      caution: body.caution || CAUTION,
      dataUsed: body.dataUsed || [],
      ruleIds: body.ruleIds || [],
      action: ['station', 'emergency'].includes(body.action) ? body.action : undefined,
      engine: 'service',
    };
  } catch (error) {
    return {
      ...scriptedReply(message, person, data, now),
      engine: 'scripted',
      fallback: true,
      fallbackReason: String(error.message || error),
    };
  } finally {
    clearTimeout(timer);
  }
}

const clip = (value, max) => String(value ?? '').trim().slice(0, max);

/** Bound the emergency context to the backend's limits (MOD-04) so a long label never causes a 400. */
function emergencyPayload(context, history) {
  const step = context.step && {
    kind: context.step.kind,
    title: clip(context.step.title, 200),
    ...(context.step.items?.length
      ? { items: context.step.items.slice(0, 8).map((item) => clip(item, 300)) }
      : {}),
  };
  const assessment = Object.fromEntries(
    ['responsive', 'breathing', 'onset']
      .filter((k) => context.assessment?.[k])
      .map((k) => [k, clip(context.assessment[k], k === 'onset' ? 60 : 40)]),
  );
  return {
    situation: clip(context.situation || 'Emergency', 120),
    ...(context.scenario ? { scenario: clip(context.scenario, 80) } : {}),
    ...(step ? { step } : {}),
    ...(Object.keys(assessment).length ? { assessment } : {}),
    ...(context.vitals?.length
      ? {
          vitals: context.vitals.slice(-12).map((v) => ({
            label: clip(v.label, 60),
            value: Number(v.value),
            unit: clip(v.unit, 20),
          })),
        }
      : {}),
    ...(Number.isFinite(context.minutesElapsed)
      ? { minutes_elapsed: Math.max(0, Math.floor(context.minutesElapsed)) }
      : {}),
    ...(history?.length
      ? {
          history: history
            .filter((m) => m.text?.trim() && (m.role === 'user' || m.role === 'assistant'))
            .slice(-6)
            .map((m) => ({ role: m.role, text: clip(m.text, 1500) })),
        }
      : {}),
  };
}

/**
 * Emergency chat (MOD-04): sends the question plus what the guide is showing. Never throws; if the
 * service is missing or fails, it answers offline from the current step so the guide keeps working.
 */
export async function askEmergencyAssistant({ message, context, history = [], timeoutMs = 45000 }) {
  if (!apiConfigured) return { ...offlineEmergencyReply(message, context), engine: 'offline' };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const body = await api('/api/assistant/chat', {
      method: 'POST',
      body: { message, emergency: emergencyPayload(context, history) },
      signal: ctrl.signal,
    });
    if (typeof body?.answer !== 'string' || !body.answer.trim())
      throw new Error('Invalid response shape');
    return {
      text: body.answer,
      sources: body.sources || [],
      caution: body.caution || null,
      engine: 'service',
    };
  } catch (error) {
    return {
      ...offlineEmergencyReply(message, context),
      engine: 'offline',
      unavailable: true,
      fallbackReason: String(error.message || error),
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Resolve a source reference (risk id, official resource id or {title,url}) for display. */
export function resolveSource(src, officialResources) {
  if (src && typeof src === 'object' && src.url)
    return { title: src.title || src.url, url: src.url, org: src.org || '' };
  if (risks[src])
    return { title: risks[src].title, url: risks[src].url, org: risks[src].org, riskId: src };
  const o = officialResources.find((x) => x.id === src);
  return o ? { title: o.title, url: o.url, org: o.org } : null;
}
