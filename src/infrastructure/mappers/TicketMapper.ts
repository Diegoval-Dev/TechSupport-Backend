import { Ticket as PrismaTicket } from '@prisma/client';
import { Ticket } from '../../domain/entities/Ticket';

export class TicketMapper {
    static toDomain(raw: PrismaTicket): Ticket {
        return new Ticket({
            id: raw.id,
            title: raw.title,
            description: raw.description,
            status: raw.status as any,
            priority: raw.priority,
            clientId: raw.clientId,
            agentId: raw.agentId ?? undefined,
            escalationLevel: raw.escalationLevel,
            createdAt: raw.createdAt,
            resolvedAt: raw.resolvedAt ?? undefined,
            resolutionTimeMin: raw.resolutionTimeMin ?? undefined,
        });
    }
}