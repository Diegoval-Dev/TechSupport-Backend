import { Request, Response } from 'express';
import { TicketService } from '../../../application/services/TicketService';
import { PrismaTicketRepository } from '../../repositories/PrismaTicketRepository';
import {
  assignAgentSchema,
  createTicketSchema,
  listTicketsSchema,
  updateStatusSchema,
} from '../validators/ticket.schemas';

interface DeleteTicketParams {
  id: string;
}

const service = new TicketService(new PrismaTicketRepository());

export class TicketController {
  static async create(req: Request, res: Response) {
    const data = createTicketSchema.parse(req.body);
    const ticket = await service.create(data);
    res.status(201).json(ticket);
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
    res.json(result);
  }

  static async updateStatus(req: Request, res: Response) {
    const data = updateStatusSchema.parse(req.body);
    const ticketId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const updated = await service.changeStatus(ticketId, data.status);
    res.json(updated);
  }

  static async assignAgent(req: Request, res: Response) {
    const data = assignAgentSchema.parse(req.body);
    const ticketId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const updated = await service.assignAgent(ticketId, {
      id: data.agentId,
      level: data.agentLevel,
    });
    res.json(updated);
  }

  static async delete(req: Request<DeleteTicketParams>, res: Response) {
    await service.delete(req.params.id);
    res.status(204).send();
  }
}
