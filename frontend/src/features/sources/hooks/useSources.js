import { useQuery } from '@tanstack/react-query';
import { api, apiList } from '../../../shared/api/apiClient.js';

export function useSources(enabled) {
  return useQuery({
    queryKey: ['sources'],
    queryFn: async () => apiList(await api('/api/sources', { auth: false })),
    enabled,
    staleTime: 5 * 60_000,
  });
}
