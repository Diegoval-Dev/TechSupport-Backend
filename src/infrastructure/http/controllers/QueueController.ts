import { Request, Response } from 'express';
import { ticketQueue } from '../../queue/ticketQueue';
import { deadLetterQueue } from '../../queue/deadLetterQueue';

export class QueueController {
  static async stats(_req: Request, res: Response) {
    const [waiting, active, completed, failed] =
      await Promise.all([
        ticketQueue.getWaitingCount(),
        ticketQueue.getActiveCount(),
        ticketQueue.getCompletedCount(),
        ticketQueue.getFailedCount(),
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