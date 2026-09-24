import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Paginated, Ticket, TicketStatus } from '../types';

export interface TicketFiltersInput {
  status?: TicketStatus;
  priority?: number;
  clientId?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

export function useTickets(filters: TicketFiltersInput) {
  return useQuery({
    queryKey: ['tickets', filters],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Ticket>>('/tickets', {
        params: {
          status: filters.status || undefined,
          priority: filters.priority || undefined,
          clientId: filters.clientId || undefined,
          from: filters.from || undefined,
          to: filters.to || undefined,
          page: filters.page,
          pageSize: filters.pageSize,
        },
      });
      return data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; description: string; clientId: string }) => {
      const { data } = await api.post<Ticket>('/tickets', input);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TicketStatus }) => {
      const { data } = await api.patch<Ticket>(`/tickets/${id}/status`, { status });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useAssignAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, agentId, agentLevel }: { id: string; agentId: string; agentLevel: number }) => {
      const { data } = await api.patch<Ticket>(`/tickets/${id}/assign`, { agentId, agentLevel });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tickets/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}
