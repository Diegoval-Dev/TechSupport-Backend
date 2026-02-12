import { Request, Response } from 'express';
import { ReportService } from '../../../application/services/ReportService';

const service = new ReportService();

export class ReportController {
  static async avgResolution(_req: Request, res: Response) {
    res.json(await service.averageResolutionByClientType());
  }

  static async escalated(_req: Request, res: Response) {
    res.json(await service.escalatedTicketsPerMonth());
  }

  static async topAgents(_req: Request, res: Response) {
    res.json(await service.topAgents());
  }

  static async weeklyStatus(_req: Request, res: Response) {
    res.json(await service.ticketsByStatusPerWeek());
  }

  static async lastProcesses(_req: Request, res: Response) {
    res.json(await service.lastProcesses());
  }
}