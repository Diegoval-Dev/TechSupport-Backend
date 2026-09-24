import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Agent, Paginated } from '../types';

export function useAgents(search = '', activeOnly = false) {
  return useQuery({
    queryKey: ['agents', search, activeOnly],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Agent>>('/agents', {
        params: { search: search || undefined, active: activeOnly || undefined, pageSize: 50 },
      });
      return data;
    },
  });
}
