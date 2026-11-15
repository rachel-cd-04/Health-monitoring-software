import { api, apiList } from '../../../shared/api/apiClient.js';

export const routineKey = (astronautId) => ['crew', 'routine', astronautId];

export async function fetchRoutine(astronautId) {
  return apiList(await api(`/api/astronauts/${astronautId}/routine`));
}

export function updateRoutineItem(astronautId, itemId, done) {
  return api(`/api/astronauts/${astronautId}/routine/${itemId}`, {
    method: 'PATCH',
    body: { done },
  });
}
