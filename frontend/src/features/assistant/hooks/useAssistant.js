import { useMutation } from '@tanstack/react-query';
import { askAssistant } from '../services/assistantAdapter.js';

export function useAssistant() {
  const mutation = useMutation({ mutationFn: askAssistant });
  return {
    askAssistant: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}
