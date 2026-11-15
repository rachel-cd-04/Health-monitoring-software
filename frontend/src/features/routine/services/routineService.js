import { api, apiList } from '../../../shared/api/apiClient.js';

export const routineKey = (astronautId, environment) => [
  'crew',
  'routine',
  astronautId,
  environment,
];

export const routineReminderId = (crewId, itemId) => `routine:${crewId}:${itemId}`;

export async function fetchRoutine(astronautId, environment = 'station') {
  return apiList(
    await api(
      `/api/astronauts/${astronautId}/routine?environment=${encodeURIComponent(environment)}`,
    ),
  );
}

export function updateRoutineItem(astronautId, itemId, done) {
  return api(`/api/astronauts/${astronautId}/routine/${itemId}`, {
    method: 'PATCH',
    body: { done },
  });
}
