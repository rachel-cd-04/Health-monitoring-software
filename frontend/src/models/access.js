// Shared-session privacy for the shared screen; authentication is handled by the API.
// General level (no code): name, role, one status light, number of items, whether today's check-in is done.
// Private level: a profile PIN unlocks only that person's data.
// Emergencies never require a code.

export const AUTO_LOCK_MS = 5 * 60000;

/** → {ok:true, scope:'self'|'all', attempts} or {ok:false, locked, lockedUntil, attemptsLeft, attempts} */
/** access = {all:boolean, ids:string[], at:number (last activity)} */
export const LOCKED = {all:false, ids:[], at:0};
export const canView = (access, personId) => !!access && (access.all || access.ids.includes(personId));
export const grant = (access, personId, scope, now = Date.now()) => scope === 'all' ? {all:true, ids:[], at:now} : {all:access.all, ids:[...new Set([...access.ids, personId])], at:now};
export const isUnlocked = access => access.all || access.ids.length > 0;
export const isExpired = (access, now = Date.now()) => isUnlocked(access) && now - access.at > AUTO_LOCK_MS;

/** General-level summary for the shared screen: never values, systems, sleep or mood. */
export function generalStatus(signals, alertActive) {
  const active = signals.filter(s => s.level !== 'info');
  if (alertActive) return {light:'red', count:1 + active.length};
  if (active.some(s => s.level === 'review')) return {light:'red', count:active.length};
  if (active.length) return {light:'amber', count:active.length};
  if (signals.some(s => s.level === 'info')) return {light:'grey', count:0};
  return {light:'green', count:0};
}
