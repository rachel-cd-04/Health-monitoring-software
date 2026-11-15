import { useMutation } from '@tanstack/react-query';
import { queryClient } from '../../../app/queryClient.js';
import { api } from '../../../shared/api/apiClient.js';

export function useAcknowledgeAlert() {
  return useMutation({
    mutationFn: ({ alertId }) => api(`/api/alerts/${alertId}/acknowledge`, { method: 'PATCH' }),
    onSuccess: (_result, variables) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['crew', 'bootstrap'] }),
        queryClient.invalidateQueries({ queryKey: ['crew', 'status', variables.astronautId] }),
      ]),
  });
}
