import { prisma } from '../database/prisma';
import { TicketFilters, TicketRepository } from '../../application/ports/TicketRepository';
import { Ticket } from '../../domain/entities/Ticket';
import { TicketStatus } from '../../domain/enums/TicketStatus';
import { TicketMapper } from '../mappers/TicketMapper';

export class PrismaTicketRepository implements TicketRepository {
  async create(ticket: Ticket): Promise<Ticket> {
    const created = await prisma.ticket.create({
      data: {
        title: ticket['props'].title,
        description: ticket['props'].description,
        status: ticket['props'].status,
        priority: ticket['props'].priority,
        clientId: ticket['props'].clientId,
      },
    });

    return TicketMapper.toDomain(created);
  }

  async findById(id: string) {
    const ticket = await prisma.ticket.findFirst({
      where: { id, deletedAt: null },
    });

    return ticket ? TicketMapper.toDomain(ticket) : null;
  }

  async findAll(filters: TicketFilters) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const createdAt =
      filters.from || filters.to
        ? {
            gte: filters.from,
            lte: filters.to,
          }
        : undefined;

    const where = {
      deletedAt: null,
      status: filters.status,
      priority: filters.priority,
      clientId: filters.clientId,
      createdAt,
    };

    const [data, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.ticket.count({ where }),
    ]);

    return {
      data: data.map(TicketMapper.toDomain),
      total,
      page,
      pageSize,
    };
  }

  async update(ticket: Ticket) {
    const data: {
      status: TicketStatus;
      agentId?: string | null;
      escalationLevel?: number;
      resolvedAt?: Date | null;
      resolutionTimeMin?: number | null;
    } = {
      status: ticket.status,
    };

    if (ticket['props'].agentId !== undefined) {
      data.agentId = ticket['props'].agentId;
    }

    if (ticket['props'].escalationLevel !== undefined) {
      data.escalationLevel = ticket['props'].escalationLevel;
    }

    if (ticket['props'].resolvedAt !== undefined) {
      data.resolvedAt = ticket['props'].resolvedAt ?? null;
    }

    if (ticket['props'].resolutionTimeMin !== undefined) {
      data.resolutionTimeMin = ticket['props'].resolutionTimeMin ?? null;
    }

    const updated = await prisma.ticket.update({
      where: { id: ticket['props'].id },
      data,
    });

    return TicketMapper.toDomain(updated);
  }

  async softDelete(id: string) {
    await prisma.ticket.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async updateStatus(id: string, newStatus: string) {
    return prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id },
      });

      if (!ticket || ticket.deletedAt) {
        throw new Error('Ticket not found');
      }

      if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
        throw new Error('Cannot modify closed ticket');
      }

      const updated = await tx.ticket.update({
        where: { id },
        data: {
          status: newStatus as TicketStatus,
        },
      });

      return TicketMapper.toDomain(updated);
    });
  }
}
