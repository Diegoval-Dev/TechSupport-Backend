import { ticketQueue } from '../../infrastructure/queue/ticketQueue';
import { deadLetterQueue } from '../../infrastructure/queue/deadLetterQueue';

export class QueueMetricsService {
  async getStats() {
    const [waiting, active, completed, failed] =
      await Promise.all([
        ticketQueue.getWaitingCount(),
        ticketQueue.getActiveCount(),
        ticketQueue.getCompletedCount(),
        ticketQueue.getFailedCount(),
      ]);

    const deadLetter = await deadLetterQueue.getWaitingCount();

    return {
      waiting,
      active,
      completed,
      failed,
      deadLetter,
    };
  }
}