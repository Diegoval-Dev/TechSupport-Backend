import { prisma } from '../database/prisma';
import { TicketRepository } from '../../application/ports/TicketRepository';
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

  async findAll() {
    const [data, total] = await Promise.all([
      prisma.ticket.findMany({ where: { deletedAt: null } }),
      prisma.ticket.count({ where: { deletedAt: null } }),
    ]);

    return {
      data: data.map(TicketMapper.toDomain),
      total,
    };
  }

  async update(ticket: Ticket) {
    const updated = await prisma.ticket.update({
      where: { id: ticket['props'].id },
      data: {
        status: ticket.status,
      },
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
