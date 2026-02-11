import { TicketStatus } from '../enums/TicketStatus';

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
    constructor(private readonly props: TicketProps) { }

    get status() {
        return this.props.status;
    }

    get escalationLevel() {
        return this.props.escalationLevel;
    }
}