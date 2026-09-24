import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Client, Paginated } from '../types';

export function useClients(search: string) {
  return useQuery({
    queryKey: ['clients', search],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Client>>('/clients', {
        params: { search: search || undefined, pageSize: 50 },
      });
      return data;
    },
  });
}
