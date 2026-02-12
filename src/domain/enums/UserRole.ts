export const UserRole = {
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  AGENTE: 'AGENTE',
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];
