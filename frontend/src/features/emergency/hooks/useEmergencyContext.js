import { useQuery } from '@tanstack/react-query';
import { api } from '../../../shared/api/apiClient.js';

export function useEmergencyContext(incidentId, enabled) {
  return useQuery({
    queryKey: ['emergency', incidentId, 'context'],
    queryFn: () => api(`/api/emergency/${incidentId}/context`, { auth: false }),
    enabled: Boolean(enabled && incidentId),
    retry: false,
  });
}
