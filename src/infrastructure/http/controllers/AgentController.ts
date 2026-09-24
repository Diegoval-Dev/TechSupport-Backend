import { Request, Response } from 'express';
import { z } from 'zod';
import { AgentService } from '../../../application/services/AgentService';
import { PrismaAgentRepository } from '../../repositories/PrismaAgentRepository';
import { listAgentsSchema } from '../validators/agent.schemas';

const service = new AgentService(new PrismaAgentRepository());

export class AgentController {
  static async list(req: Request, res: Response) {
    try {
      const data = listAgentsSchema.parse(req.query);
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
