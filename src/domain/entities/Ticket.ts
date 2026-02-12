import { TicketStatus } from '../enums/TicketStatus';
import { DomainError } from '../errors/DomainError';

export interface TicketProps {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: number;
  clientId: string;
  agentId?: string;
  escalationLevel: number;
  createdAt: Date;
  resolvedAt?: Date;
  resolutionTimeMin?: number;
}

export class Ticket {
  constructor(private readonly props: TicketProps) {}

  get status() {
    return this.props.status;
  }

  get escalationLevel() {
    return this.props.escalationLevel;
  }

  resolve() {
    if (this.props.status !== TicketStatus.IN_PROGRESS) {
      throw new DomainError('Ticket must be in progress to resolve');
    }

    this.props.status = TicketStatus.RESOLVED;
    this.props.resolvedAt = new Date();
    this.props.resolutionTimeMin =
      (this.props.resolvedAt.getTime() - this.props.createdAt.getTime()) / 60000;
  }

  escalate() {
    this.props.status = TicketStatus.ESCALATED;
    this.props.escalationLevel += 1;
  }

  startProgress() {
    if (this.props.status !== TicketStatus.OPEN) {
      throw new DomainError('Only open tickets can move to in progress');
    }
    this.props.status = TicketStatus.IN_PROGRESS;
  }
  assignAgent(agentId: string) {
    this.props.agentId = agentId;
  }
}
