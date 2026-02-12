import { Ticket } from '../../domain/entities/Ticket';

export interface TicketRepository {
  create(ticket: Ticket): Promise<Ticket>;
  findById(id: string): Promise<Ticket | null>;
  findAll(filters: Record<string, unknown>): Promise<{ data: Ticket[]; total: number }>;
  update(ticket: Ticket): Promise<Ticket>;
  softDelete(id: string): Promise<void>;
}
