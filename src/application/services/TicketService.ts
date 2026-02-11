import { TicketRepository } from '../ports/TicketRepository';
import { Ticket } from '../../domain/entities/Ticket';
import { TicketStatus } from '../../domain/enums/TicketStatus';

export class TicketService {
    constructor(private readonly repo: TicketRepository) { }

    async create(data: any) {
        const ticket = new Ticket({
            ...data,
            status: TicketStatus.OPEN,
            escalationLevel: 0,
            createdAt: new Date(),
        });

        return this.repo.create(ticket);
    }

    async list() {
        return this.repo.findAll({});
    }

    async delete(id: string) {
        await this.repo.softDelete(id);
    }
}