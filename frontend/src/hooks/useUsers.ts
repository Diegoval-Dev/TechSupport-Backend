import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { AppUser, Paginated, UserRole } from '../types';

export function useUsers(page: number) {
  return useQuery({
    queryKey: ['users', page],
    queryFn: async () => {
      const { data } = await api.get<Paginated<AppUser>>('/auth/users', {
        params: { page, pageSize: 20 },
      });
      return data;
    },
  });
}

interface RegisterUserInput {
  email: string;
  password: string;
  role: UserRole;
  active: boolean;
}

export function useRegisterUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RegisterUserInput) => {
      const { data } = await api.post<AppUser>('/auth/register', input);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
