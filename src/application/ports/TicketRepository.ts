import { Ticket } from '../../domain/entities/Ticket';
import { TicketStatus } from '../../domain/enums/TicketStatus';

export interface TicketFilters {
  status?: TicketStatus;
  priority?: number;
  clientId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

export interface TicketRepository {
  create(ticket: Ticket): Promise<Ticket>;
  findById(id: string): Promise<Ticket | null>;
  findAll(filters: TicketFilters): Promise<{
    data: Ticket[];
    total: number;
    page: number;
    pageSize: number;
  }>;
  update(ticket: Ticket): Promise<Ticket>;
  softDelete(id: string): Promise<void>;
}
