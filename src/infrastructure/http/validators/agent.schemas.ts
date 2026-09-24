import { z } from 'zod';

export const listAgentsSchema = z.object({
  search: z.string().min(1).optional(),
  active: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});
