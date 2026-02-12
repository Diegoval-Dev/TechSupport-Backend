import { z } from 'zod';

export const ticketLogSchema = z.object({
  client_id: z.uuid(),
  ticket_id: z.uuid(),
  tipo_cliente: z.enum(['VIP', 'NORMAL']),
  fecha_creacion: z.string(),
  fecha_resolucion: z.string(),
  agente_id: z.uuid(),
  nivel_escalamiento: z.number(),
  estado: z.string(),
});