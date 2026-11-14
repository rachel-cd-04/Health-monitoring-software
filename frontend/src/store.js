import { DAY, MISSION_DAY, generate } from './sim';

const KEY = 'soma-v3';

export function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }

export function freshState() {
  const start = startOfToday() - (MISSION_DAY - 1) * DAY;
  return { version: 3, start, records: generate(start), emergencyLogs: [], checkins: [], ack: {}, operator: 'ines' };
}
export function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s?.version === 3 && Array.isArray(s.records) && Array.isArray(s.emergencyLogs)) return { ...s, checkins: s.checkins || [] };
  } catch { /* fresh simulation when storage is unavailable or invalid */ }
  return freshState();
}
export function saveState(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch { return false; } }

export const uid = () => (globalThis.crypto?.randomUUID?.() ?? 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
export function makeRecord(astroId, indicator, value, unit, extra = {}) {
  return { id: uid(), astroId, indicator, value, unit, ts: Date.now(), day: MISSION_DAY, source: 'manual', ...extra };
}

export const fmtTime = t => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
export const fmtVal = v => Number(v).toLocaleString('en-US', { maximumFractionDigits: 1 });
export const dateOfDay = (start, day) => new Date(start + (day - 1) * DAY);
export const fmtDate = d => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
export function latestOf(series, astroId, indicator) {
  const s = series[astroId]?.[indicator];
  return s && s.length ? s[s.length - 1] : null;
}

// "Normal for you" / "Higher than usual" / "Lower than usual"
export function vsBaseline(indicator, value, b, small) {
  if (!b) return 'normal';
  const tol = Math.max(2 * b.sd, small ? 1 : Math.abs(b.mean) * 0.08);
  if (value > b.mean + tol) return 'higher';
  if (value < b.mean - tol) return 'lower';
  return 'normal';
}
export function downloadFile(name, data, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
