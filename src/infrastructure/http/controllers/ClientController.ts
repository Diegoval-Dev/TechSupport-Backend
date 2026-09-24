import { Request, Response } from 'express';
import { z } from 'zod';
import { ClientService } from '../../../application/services/ClientService';
import { PrismaClientRepository } from '../../repositories/PrismaClientRepository';
import { listClientsSchema } from '../validators/client.schemas';

const service = new ClientService(new PrismaClientRepository());

export class ClientController {
  static async list(req: Request, res: Response) {
    try {
      const data = listClientsSchema.parse(req.query);
      const result = await service.list(data);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Invalid query parameters',
          error: error.message,
        });
      }
      throw error;
    }
  }
}
