import { Request, Response } from 'express';
import { getTicketQueue } from '../../queue/ticketQueue';
import { deadLetterQueue } from '../../queue/deadLetterQueue';

export class QueueController {
  static async stats(_req: Request, res: Response) {
    const [waiting, active, completed, failed] =
      await Promise.all([
        getTicketQueue().getWaitingCount(),
        getTicketQueue().getActiveCount(),
        getTicketQueue().getCompletedCount(),
        getTicketQueue().getFailedCount(),
      ]);

    const dlqCount = await deadLetterQueue.getWaitingCount();

    res.json({
      waiting,
      active,
      completed,
      failed,
      deadLetter: dlqCount,
    });
  }
  static async deadLetters(_req: Request, res: Response) {
    const jobs = await deadLetterQueue.getJobs(['waiting']);

    res.json(
      jobs.map((job) => ({
        id: job.id,
        data: job.data,
        attempts: job.attemptsMade,
      })),
    );
  }
}