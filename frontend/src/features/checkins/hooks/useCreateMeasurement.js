import { useMutation } from '@tanstack/react-query';
import { queryClient } from '../../../app/queryClient.js';
import { persistMeasurement } from '../services/measurementService.js';

export function useCreateMeasurement() {
  return useMutation({
    mutationFn: persistMeasurement,
    onSuccess: (_result, variables) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['crew', 'status', variables.astronautId] }),
        queryClient.invalidateQueries({ queryKey: ['crew', 'history', variables.astronautId] }),
        queryClient.invalidateQueries({ queryKey: ['crew', 'checkins', variables.astronautId] }),
        queryClient.invalidateQueries({ queryKey: ['crew', 'routine', variables.astronautId] }),
        queryClient.invalidateQueries({ queryKey: ['crew', 'bootstrap'] }),
      ]),
  });
}
