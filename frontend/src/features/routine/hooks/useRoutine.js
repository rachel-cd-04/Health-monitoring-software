import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchRoutine, routineKey, updateRoutineItem } from '../services/routineService.js';

export function useRoutine(astronautId) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: routineKey(astronautId),
    queryFn: () => fetchRoutine(astronautId),
    enabled: Boolean(astronautId),
  });
  const mutation = useMutation({
    mutationFn: ({ itemId, done }) => updateRoutineItem(astronautId, itemId, done),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: routineKey(astronautId) }),
  });

  return {
    ...query,
    updateItem: mutation.mutate,
    isUpdating: mutation.isPending,
    updateError: mutation.error,
  };
}
