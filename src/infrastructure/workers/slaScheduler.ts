import { prisma } from '../database/prisma';
import { TicketMapper } from '../mappers/TicketMapper';
import { SLAService } from '../../application/services/SLAService';
import { logger } from '../logger/logger';
import { TicketStatus } from '@prisma/client';

const DEFAULT_INTERVAL_MS = 60 * 1000;

export const startSlaScheduler = () => {
  const service = new SLAService();
  const intervalMs = Number(process.env.SLA_SCHEDULER_INTERVAL_MS) || DEFAULT_INTERVAL_MS;

  const run = async () => {
    try {
      const threshold = new Date(Date.now() - 2 * 60 * 60 * 1000);

      const tickets = await prisma.ticket.findMany({
        where: {
          deletedAt: null,
          status: TicketStatus.OPEN,
          createdAt: { lte: threshold },
        },
        include: {
          client: true,
        },
      });

      for (const item of tickets) {
        const ticket = TicketMapper.toDomain(item);
        const beforeStatus = ticket.status;

        service.check(ticket, item.client.type);

        if (ticket.status !== beforeStatus) {
          await prisma.ticket.update({
            where: { id: ticket['props'].id },
            data: {
              status: ticket.status,
              escalationLevel: ticket['props'].escalationLevel,
            },
          });
        }
      }
    } catch (error) {
      logger.error({ error }, 'SLA scheduler run failed');
    }
  };

  run();
  const timer = setInterval(run, intervalMs);

  return () => clearInterval(timer);
};
