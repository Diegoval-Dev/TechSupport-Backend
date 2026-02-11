import { Ticket } from '../../domain/entities/Ticket';
import { ClientType } from '@prisma/client';
import { logger } from '../../infrastructure/logger/logger';

export class SLAService {
  check(ticket: Ticket, clientType: ClientType) {
    const now = new Date();
    const diffHours =
      (now.getTime() - ticket['props'].createdAt.getTime()) / 3600000;

    if (clientType === 'VIP' && diffHours >= 2) {
      ticket.escalate();
    }

    if (clientType === 'NORMAL' && diffHours >= 24) {
      logger.warn({
        message: 'Supervisor notification: SLA breached',
        ticketId: ticket['props'].id,
      });
    }
  }
}