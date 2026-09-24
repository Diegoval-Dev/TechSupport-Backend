import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useReport<T = unknown[]>(endpoint: string) {
  return useQuery({
    queryKey: ['reports', endpoint],
    queryFn: async () => {
      const { data } = await api.get<T>(`/reports/${endpoint}`);
      return data;
    },
  });
}
