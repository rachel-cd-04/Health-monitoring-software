import { api } from '../../../shared/api/apiClient.js';

export function createEmergency(body) {
  return api('/api/emergency', { method: 'POST', auth: false, body });
}

export function appendEmergencyStep(incidentId, body) {
  return api(`/api/emergency/${incidentId}/steps`, { method: 'POST', auth: false, body });
}

export function closeEmergency(incidentId, endedAt) {
  return api(`/api/emergency/${incidentId}/close`, {
    method: 'PATCH',
    auth: false,
    body: { ended_at: endedAt },
  });
}

export function fetchEmergencySummary(incidentId) {
  return api(`/api/emergency/${incidentId}/summary`, { auth: false });
}
