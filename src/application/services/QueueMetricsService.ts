import { getTicketQueue } from '../../infrastructure/queue/ticketQueue';
import { deadLetterQueue } from '../../infrastructure/queue/deadLetterQueue';

export class QueueMetricsService {
  async getStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      getTicketQueue().getWaitingCount(),
      getTicketQueue().getActiveCount(),
      getTicketQueue().getCompletedCount(),
      getTicketQueue().getFailedCount(),
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
