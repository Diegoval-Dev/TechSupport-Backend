import axios from 'axios';
import { decodeJwt } from './jwt';
import type { AppUser, LoginResponse } from '../types';

const STORAGE_KEY = 'techsupport.session';
const REFRESH_MARGIN_MS = 60_000;

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

interface SessionState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  user: AppUser | null;
}

const rawClient = axios.create({ baseURL: API_URL });

let state: SessionState = { accessToken: null, refreshToken: null, expiresAt: null, user: null };
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let refreshInFlight: Promise<string | null> | null = null;
const listeners = new Set<() => void>();

function persist() {
  if (state.accessToken && state.refreshToken && state.user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

function scheduleRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);
  if (!state.expiresAt) return;

  const delay = Math.max(state.expiresAt - Date.now() - REFRESH_MARGIN_MS, 5_000);
  refreshTimer = setTimeout(() => {
    void refresh();
  }, delay);
}

function buildUser(email: string, accessToken: string): AppUser | null {
  const payload = decodeJwt(accessToken);
  if (!payload) return null;
  return { id: payload.sub, email, role: payload.role, active: true };
}

export function getState() {
  return state;
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function loadFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw) as SessionState;
    state = parsed;
    if (state.expiresAt && state.expiresAt <= Date.now()) {
      void refresh();
    } else {
      scheduleRefresh();
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  notify();
}

export function setSessionFromLogin(email: string, tokens: LoginResponse) {
  const user = buildUser(email, tokens.accessToken);
  state = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: Date.now() + tokens.expiresIn * 1000,
    user,
  };
  persist();
  scheduleRefresh();
  notify();
}

export function clearSession() {
  state = { accessToken: null, refreshToken: null, expiresAt: null, user: null };
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = null;
  persist();
  notify();
}

export async function refresh(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  if (!state.accessToken || !state.refreshToken || !state.user) return null;

  const email = state.user.email;

  refreshInFlight = rawClient
    .post<LoginResponse>(
      '/auth/refresh',
      { refreshToken: state.refreshToken },
      { headers: { Authorization: `Bearer ${state.accessToken}` } },
    )
    .then((res) => {
      setSessionFromLogin(email, res.data);
      return res.data.accessToken;
    })
    .catch(() => {
      clearSession();
      return null;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}
