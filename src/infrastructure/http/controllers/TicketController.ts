import { Request, Response } from 'express';
import { TicketService } from '../../../application/services/TicketService';
import { PrismaTicketRepository } from '../../repositories/PrismaTicketRepository';

interface DeleteTicketParams {
  id: string;
}

const service = new TicketService(new PrismaTicketRepository());

export class TicketController {
  static async create(req: Request, res: Response) {
    const ticket = await service.create(req.body);
    res.status(201).json(ticket);
  }

  static async list(_req: Request, res: Response) {
    const result = await service.list();
    res.json(result);
  }

  static async delete(req: Request<DeleteTicketParams>, res: Response) {
    await service.delete(req.params.id);
    res.status(204).send();
  }
}
