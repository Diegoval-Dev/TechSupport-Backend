import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_URL, clearSession, getState, refresh } from './session';

export const api = axios.create({ baseURL: API_URL });

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retried?: boolean;
  }
}

api.interceptors.request.use((config) => {
  const { accessToken } = getState();
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return config;
});

const AUTH_ENDPOINTS = ['/auth/login', '/auth/refresh'];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig | undefined;
    const isAuthEndpoint = AUTH_ENDPOINTS.some((path) => originalRequest?.url?.includes(path));

    if (error.response?.status === 401 && originalRequest && !originalRequest._retried && !isAuthEndpoint) {
      originalRequest._retried = true;
      const newToken = await refresh();

      if (newToken) {
        originalRequest.headers.set('Authorization', `Bearer ${newToken}`);
        return api(originalRequest);
      }

      clearSession();
    }

    return Promise.reject(error);
  },
);

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as { message?: string; error?: string } | undefined;
    return body?.error || body?.message || error.message || 'Ocurrió un error inesperado';
  }
  if (error instanceof Error) return error.message;
  return 'Ocurrió un error inesperado';
}
