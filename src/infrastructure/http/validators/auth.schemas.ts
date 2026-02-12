import { z } from 'zod';
import { UserRole } from '../../../domain/enums/UserRole';

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(32),
});

export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
  role: z.nativeEnum(UserRole),
  active: z.boolean().optional(),
});
