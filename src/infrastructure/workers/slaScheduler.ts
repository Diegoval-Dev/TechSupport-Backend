import { prisma } from '../database/prisma';
import { TicketMapper } from '../mappers/TicketMapper';
import { SLAService } from '../../application/services/SLAService';
import { logger } from '../logger/logger';
import { TicketStatus } from '@prisma/client';
import { getSlaEventQueue } from '../queue/slaEventQueue';

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

      const eventQueue = getSlaEventQueue();
      const slaUpdates: Array<{ id: string; escalationLevel: number; status: TicketStatus }> = [];

      for (const item of tickets) {
        const ticket = TicketMapper.toDomain(item);
        const beforeStatus = ticket.status;


        const slaResult = service.check(ticket, item.client.type);


        await eventQueue.add('process-sla-event', {
          ticketId: slaResult.ticketId,
          clientType: slaResult.clientType,
          escalated: slaResult.escalated,
          needsSupervisorNotif: slaResult.needsSupervisorNotif,
          slaHoursElapsed: slaResult.salaDifference,
        });


        if (ticket.status !== beforeStatus) {
          slaUpdates.push({
            id: ticket['props'].id,
            status: ticket.status,
            escalationLevel: ticket['props'].escalationLevel,
          });
        }
      }


      if (slaUpdates.length > 0) {
        for (const update of slaUpdates) {
          await prisma.ticket.update({
            where: { id: update.id },
            data: {
              status: update.status,
              escalationLevel: update.escalationLevel,
            },
          });
        }

        logger.info({ count: slaUpdates.length }, 'SLA escalations applied');
      }
    } catch (error) {
      logger.error({ error }, 'SLA scheduler run failed');
    }
  };

  run();
  const timer = setInterval(run, intervalMs);

  return () => clearInterval(timer);
};
