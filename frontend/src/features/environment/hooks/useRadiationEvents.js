import { useQuery } from '@tanstack/react-query';
import { api, apiList } from '../../../shared/api/apiClient.js';

export function useRadiationEvents(enabled) {
  return useQuery({
    queryKey: ['environment', 'radiation-events'],
    queryFn: async () => apiList(await api('/api/radiation/events', { auth: false })),
    enabled,
    staleTime: 60_000,
  });
}
