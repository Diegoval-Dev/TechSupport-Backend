import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { DeadLetterJob, QueueStats } from '../types';

export function useQueueStats() {
  return useQuery({
    queryKey: ['queue', 'stats'],
    queryFn: async () => {
      const { data } = await api.get<QueueStats>('/queue/stats');
      return data;
    },
    refetchInterval: 10_000,
  });
}

export function useDeadLetters() {
  return useQuery({
    queryKey: ['queue', 'dlq'],
    queryFn: async () => {
      const { data } = await api.get<DeadLetterJob[]>('/queue/dlq');
      return data;
    },
    refetchInterval: 15_000,
  });
}
