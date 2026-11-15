import { useQuery } from '@tanstack/react-query';
import { api } from '../../../shared/api/apiClient.js';

export const healthKey = ['health'];

export function useHealth(enabled) {
  return useQuery({
    queryKey: healthKey,
    queryFn: () => api('/health', { auth: false }),
    enabled,
    refetchInterval: 30_000,
    retry: false,
  });
}
