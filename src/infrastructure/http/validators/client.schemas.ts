import { z } from 'zod';

export const listClientsSchema = z.object({
  search: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});
