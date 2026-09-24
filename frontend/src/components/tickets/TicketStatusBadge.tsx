import { Badge } from '../ui/Badge';
import { TicketStatus } from '../../types';

const CONFIG: Record<TicketStatus, { label: string; tone: 'slate' | 'blue' | 'amber' | 'green' | 'red' | 'purple' }> = {
  OPEN: { label: 'Abierto', tone: 'blue' },
  IN_PROGRESS: { label: 'En progreso', tone: 'amber' },
  RESOLVED: { label: 'Resuelto', tone: 'green' },
  CLOSED: { label: 'Cerrado', tone: 'slate' },
  ESCALATED: { label: 'Escalado', tone: 'red' },
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const config = CONFIG[status];
  return <Badge tone={config.tone}>{config.label}</Badge>;
}

export function availableStatusActions(status: TicketStatus): { status: TicketStatus; label: string }[] {
  switch (status) {
    case TicketStatus.OPEN:
      return [
        { status: TicketStatus.IN_PROGRESS, label: 'Iniciar progreso' },
        { status: TicketStatus.ESCALATED, label: 'Escalar' },
      ];
    case TicketStatus.IN_PROGRESS:
      return [
        { status: TicketStatus.RESOLVED, label: 'Resolver' },
        { status: TicketStatus.ESCALATED, label: 'Escalar' },
      ];
    case TicketStatus.ESCALATED:
      return [{ status: TicketStatus.ESCALATED, label: 'Escalar más' }];
    default:
      return [];
  }
}
