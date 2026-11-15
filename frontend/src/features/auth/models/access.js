// Shared-session privacy for the shared screen; authentication is handled by the API.
// General level (no code): name, role, one status light, number of items, whether today's check-in is done.
// Private level: a profile PIN unlocks only that person's data.
// Emergencies never require a code.

export const AUTO_LOCK_MS = 5 * 60000;

/** → {ok:true, scope:'self'|'all', attempts} or {ok:false, locked, lockedUntil, attemptsLeft, attempts} */
/** access = {all:boolean, ids:string[], at:number (last activity)} */
export const LOCKED = { all: false, ids: [], at: 0 };
export const canView = (access, personId) =>
  !!access && (access.all || access.ids.includes(personId));
export const grant = (access, personId, scope, now = Date.now()) =>
  scope === 'all'
    ? { all: true, ids: [], at: now }
    : { all: access.all, ids: [...new Set([...access.ids, personId])], at: now };
export const isUnlocked = (access) => access.all || access.ids.length > 0;
export const isExpired = (access, now = Date.now()) =>
  isUnlocked(access) && now - access.at > AUTO_LOCK_MS;

/** General-level summary for the shared screen: never values, systems, sleep or mood. */
export function generalStatus(signals, alertActive) {
  const active = signals.filter((s) => s.level !== 'info');
  if (alertActive) return { light: 'red', count: 1 + active.length };
  if (active.some((s) => s.level === 'review')) return { light: 'red', count: active.length };
  if (active.length) return { light: 'amber', count: active.length };
  if (signals.some((s) => s.level === 'info')) return { light: 'grey', count: 0 };
  return { light: 'green', count: 0 };
}

// ── Chat privacy on the shared screen ──
// Assistant conversations live in memory only, one thread per person plus a "general" one. They are
// wiped whenever the private session ends, so the next person at the screen (including the commander,
// who may see health data but not other people's conversations) never sees them.
// Emergency threads (`emergency-<incident id>`) belong to the incident, not to a person, and are kept.
export const GENERAL_THREAD = 'general';
export const isIncidentThread = (key) => String(key).startsWith('emergency-');

/** Threads that survive a lock or a new sign-in: only the incident ones. */
export const keepIncidentThreads = (chatThreads = {}) =>
  Object.fromEntries(Object.entries(chatThreads).filter(([key]) => isIncidentThread(key)));

/** The general thread needs no PIN, so it expires after AUTO_LOCK_MS without new messages. */
export function expireGeneralThread(chatThreads = {}, now = Date.now()) {
  const thread = chatThreads[GENERAL_THREAD];
  if (!thread?.length) return chatThreads;
  const last = Math.max(...thread.map((m) => m.time || 0));
  if (now - last <= AUTO_LOCK_MS) return chatThreads;
  const rest = { ...chatThreads };
  delete rest[GENERAL_THREAD];
  return rest;
}
