import { Ticket } from '../../domain/entities/Ticket';
import { ClientType } from '@prisma/client';

export interface SLACheckResult {
  escalated: boolean;
  needsSupervisorNotif: boolean;
  ticketId: string;
  clientType: ClientType;
  salaDifference?: number;
}

export class SLAService {
  check(ticket: Ticket, clientType: ClientType): SLACheckResult {
    const now = new Date();
    const diffHours = (now.getTime() - ticket['props'].createdAt.getTime()) / 3600000;

    const result: SLACheckResult = {
      ticketId: ticket['props'].id,
      clientType,
      escalated: false,
      needsSupervisorNotif: false,
      salaDifference: diffHours,
    };

    if (clientType === 'VIP' && diffHours >= 2) {
      ticket.escalate();
      result.escalated = true;
    }

    if (clientType === 'NORMAL' && diffHours >= 24) {
      result.needsSupervisorNotif = true;
    }

    return result;
  }
}
