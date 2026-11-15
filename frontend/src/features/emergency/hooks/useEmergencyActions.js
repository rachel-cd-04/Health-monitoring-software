import { useMutation } from '@tanstack/react-query';
import {
  appendEmergencyStep,
  closeEmergency,
  createEmergency,
  fetchEmergencySummary,
} from '../services/emergencyService.js';

export function useEmergencyActions() {
  const create = useMutation({ mutationFn: createEmergency });
  const appendStep = useMutation({
    mutationFn: ({ incidentId, body }) => appendEmergencyStep(incidentId, body),
  });
  const close = useMutation({
    mutationFn: ({ incidentId, endedAt }) => closeEmergency(incidentId, endedAt),
  });
  const summary = useMutation({ mutationFn: fetchEmergencySummary });

  return {
    createEmergency: create.mutateAsync,
    appendEmergencyStep: appendStep.mutateAsync,
    closeEmergency: close.mutateAsync,
    fetchEmergencySummary: summary.mutateAsync,
  };
}
