import { useQuery } from '@tanstack/react-query';
import { api, apiList } from '../../../shared/api/apiClient.js';

export const crewBootstrapKey = ['crew', 'bootstrap'];

async function fetchCrewBootstrap() {
  const [people, overview] = await Promise.all([
    api('/api/astronauts', { auth: false }),
    api('/api/crew/overview', { auth: false }),
  ]);
  return {
    crew: apiList(people).map((person) => ({
      ...person,
      frontendId: String(person.name || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .split(' ')[0]
        .toLowerCase(),
    })),
    overview,
  };
}

export function useCrewBootstrap(enabled) {
  return useQuery({
    queryKey: crewBootstrapKey,
    queryFn: fetchCrewBootstrap,
    enabled,
  });
}
