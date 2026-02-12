import { Request, Response } from 'express';
import { TicketService } from '../../../application/services/TicketService';
import { PrismaTicketRepository } from '../../repositories/PrismaTicketRepository';
import {
  assignAgentSchema,
  createTicketSchema,
  listTicketsSchema,
  listTicketsResponseSchema,
  ticketResponseSchema,
  updateStatusSchema,
} from '../validators/ticket.schemas';

interface DeleteTicketParams {
  id: string;
}

const service = new TicketService(new PrismaTicketRepository());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serializeTicket = (ticket: any) => {
  const props = ticket.props;

  return {
    id: props.id,
    title: props.title,
    description: props.description,
    status: props.status,
    priority: props.priority,
    clientId: props.clientId,
    agentId: props.agentId ?? null,
    escalationLevel: props.escalationLevel,
    createdAt: props.createdAt.toISOString(),
    resolvedAt: props.resolvedAt ? props.resolvedAt.toISOString() : null,
    resolutionTimeMin: props.resolutionTimeMin ?? null,
  };
};

export class TicketController {
  static async create(req: Request, res: Response) {
    const data = createTicketSchema.parse(req.body);
    const ticket = await service.create(data);
    const response = ticketResponseSchema.parse(serializeTicket(ticket));
    res.status(201).json(response);
  }

  static async list(req: Request, res: Response) {
    const data = listTicketsSchema.parse(req.query);
    const normalizedPage = data.page ?? 1;
    const normalizedPageSize = data.pageSize ?? 20;
    const result = await service.list({
      status: data.status,
      priority: data.priority,
      clientId: data.clientId,
      from: data.from,
      to: data.to,
      page: normalizedPage,
      pageSize: normalizedPageSize,
    });

    const response = listTicketsResponseSchema.parse({
      data: result.data.map(serializeTicket),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    });

    res.json(response);
  }

  static async updateStatus(req: Request, res: Response) {
    const data = updateStatusSchema.parse(req.body);
    const updated = await service.changeStatus(req.params.id as string, data.status);
    const response = ticketResponseSchema.parse(serializeTicket(updated));
    res.json(response);
  }

  static async assignAgent(req: Request, res: Response) {
    const data = assignAgentSchema.parse(req.body);
    const updated = await service.assignAgent(req.params.id as string, {
      id: data.agentId,
      level: data.agentLevel,
    });
    const response = ticketResponseSchema.parse(serializeTicket(updated));
    res.json(response);
  }

  static async delete(req: Request<DeleteTicketParams>, res: Response) {
    await service.delete(req.params.id);
    res.status(204).send();
  }
}
