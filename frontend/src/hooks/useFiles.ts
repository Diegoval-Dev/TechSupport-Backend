import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { FileProcessRow, UploadFileResponse } from '../types';

export function useUploadFile() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post<UploadFileResponse>('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
  });
}

export function useFileStatus(processId: string | null) {
  return useQuery({
    queryKey: ['files', 'status', processId],
    queryFn: async () => {
      const { data } = await api.get<FileProcessRow>(`/files/status/${processId}`);
      return data;
    },
    enabled: Boolean(processId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'completed' || status === 'completed_with_errors' || status === 'failed' ? false : 3000;
    },
  });
}
