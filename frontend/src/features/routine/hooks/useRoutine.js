import { useQuery } from '@tanstack/react-query';
import { fetchRoutine, routineKey } from '../services/routineService.js';

export function useRoutine(astronautId, environment) {
  return useQuery({
    queryKey: routineKey(astronautId, environment),
    queryFn: () => fetchRoutine(astronautId, environment),
    enabled: Boolean(astronautId),
  });
}
