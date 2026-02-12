import { z } from 'zod';
import { TicketStatus } from '../../../domain/enums/TicketStatus';

export const createTicketSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(3),
  clientId: z.string().uuid(),
});

export const listTicketsSchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  priority: z.coerce.number().int().positive().optional(),
  clientId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum([
    TicketStatus.IN_PROGRESS,
    TicketStatus.RESOLVED,
    TicketStatus.ESCALATED,
  ]),
});

export const assignAgentSchema = z.object({
  agentId: z.string().uuid(),
  agentLevel: z.coerce.number().int().min(1),
});
