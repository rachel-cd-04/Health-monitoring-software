import { useQuery } from '@tanstack/react-query';
import { api, apiList } from '../../../shared/api/apiClient.js';

export function useCrewAlerts(enabled) {
  return useQuery({
    queryKey: ['crew', 'alerts'],
    queryFn: async () => apiList(await api('/api/crew/alerts')),
    enabled,
  });
}
