import { useMutation } from '@tanstack/react-query';
import { queryClient } from '../../../app/queryClient.js';
import { persistCheckIn } from '../services/checkInService.js';

export function useCreateCheckin() {
  return useMutation({
    mutationFn: ({ session, records, astronautId }) =>
      persistCheckIn({ session, records, astronautId }),
    onSuccess: (_result, variables) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['crew', 'status', variables.astronautId] }),
        queryClient.invalidateQueries({ queryKey: ['crew', 'history', variables.astronautId] }),
        queryClient.invalidateQueries({ queryKey: ['crew', 'checkins', variables.astronautId] }),
      ]),
  });
}
