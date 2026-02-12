import { TicketFilters, TicketRepository } from '../ports/TicketRepository';
import { Ticket } from '../../domain/entities/Ticket';
import { TicketStatus } from '../../domain/enums/TicketStatus';
import { ApplicationError } from '../errors/ApplicationError';

interface CreateTicketData {
  title: string;
  description: string;
  clientId: string;
}

export class TicketService {
  constructor(private readonly repo: TicketRepository) {}

  async create(data: CreateTicketData) {
    const ticket = new Ticket({
      id: crypto.randomUUID(),
      title: data.title,
      description: data.description,
      status: TicketStatus.OPEN,
      escalationLevel: 0,
      createdAt: new Date(),
      priority: 2,
      clientId: data.clientId,
    });

    return this.repo.create(ticket);
  }

  async list(filters: TicketFilters) {
    return this.repo.findAll(filters);
  }

  async delete(id: string) {
    await this.repo.softDelete(id);
  }

  async assignAgent(ticketId: string, agent: { id: string; level: number }) {
    const ticket = await this.repo.findById(ticketId);

    if (!ticket) {
      throw new ApplicationError('Ticket not found', 404);
    }

    if (ticket.status === TicketStatus.ESCALATED && agent.level < 2) {
      throw new ApplicationError('Escalated tickets require level 2+ agent', 403);
    }

    ticket['props'].agentId = agent.id;

    return this.repo.update(ticket);
  }

  async changeStatus(id: string, newStatus: TicketStatus) {
    const ticket = await this.repo.findById(id);

    if (!ticket) {
      throw new ApplicationError('Ticket not found', 404);
    }

    switch (newStatus) {
      case TicketStatus.IN_PROGRESS:
        ticket.startProgress();
        break;

      case TicketStatus.RESOLVED:
        ticket.resolve();
        break;

      case TicketStatus.ESCALATED:
        ticket.escalate();
        break;
    }

    return this.repo.update(ticket);
  }
}
