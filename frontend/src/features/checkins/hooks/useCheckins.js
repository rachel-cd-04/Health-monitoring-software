import { useQuery } from '@tanstack/react-query';
import { api } from '../../../shared/api/apiClient.js';

export const checkinsKey = (astronautId, days = 30) => ['crew', 'checkins', astronautId, days];

export function fetchCheckins(astronautId, days = 30) {
  return api(`/api/astronauts/${astronautId}/checkins?days=${days}`);
}

export function useCheckins(astronautId, enabled = false, days = 30) {
  return useQuery({
    queryKey: checkinsKey(astronautId, days),
    queryFn: () => fetchCheckins(astronautId, days),
    enabled: enabled && Boolean(astronautId),
  });
}
