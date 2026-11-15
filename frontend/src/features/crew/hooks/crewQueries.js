import { api } from '../../../shared/api/apiClient.js';

export const crewStatusKey = (astronautId) => ['crew', 'status', astronautId];
export const crewHistoryKey = (astronautId, indicator, days) => [
  'crew',
  'history',
  astronautId,
  indicator,
  days,
];

export function fetchCrewStatus(astronautId) {
  return api(`/api/astronauts/${astronautId}/status`);
}

export function fetchCrewHistory(astronautId, indicator, days = 180) {
  return api(
    `/api/astronauts/${astronautId}/history?indicator=${encodeURIComponent(indicator)}&days=${days}`,
  );
}
