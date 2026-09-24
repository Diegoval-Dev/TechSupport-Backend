export const UserRole = {
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  AGENTE: 'AGENTE',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const TicketStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
  ESCALATED: 'ESCALATED',
} as const;
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: number;
  clientId: string;
  agentId: string | null;
  escalationLevel: number;
  createdAt: string;
  resolvedAt: string | null;
  resolutionTimeMin: number | null;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  type: 'VIP' | 'NORMAL';
  company: string;
  createdAt: string;
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  level: number;
  active: boolean;
}

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  active: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string;
  role: UserRole;
  email?: string;
  iat: number;
  exp: number;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  deadLetter: number;
}

export interface DeadLetterJob {
  id: string | undefined;
  data: unknown;
  attempts: number;
}

export interface UploadFileResponse {
  processId: string;
}

export interface ApiErrorBody {
  message: string;
  error?: string;
}

export interface AvgResolutionRow {
  _id: 'VIP' | 'NORMAL' | null;
  avgResolutionMinutes: number | null;
}

export interface EscalatedPerMonthRow {
  _id: { year: number; month: number };
  count: number;
}

export interface TopAgentRow {
  _id: string | null;
  avgResolution: number | null;
}

export interface WeeklyStatusRow {
  _id: { week: number; status: TicketStatus };
  count: number;
}

export interface FileProcessRow {
  _id: string;
  processId: string;
  total: number;
  processed: number;
  failed: number;
  status: 'pending' | 'processing' | 'completed' | 'completed_with_errors' | 'failed';
  createdAt: string;
  updatedAt: string;
}
