import { Queue } from 'bullmq';
import { redisConfig } from './connection';

let queue: Queue | null = null;

export const getTicketQueue = () => {
  if (!queue) {
    queue = new Queue('ticket-processing', {
      connection: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    });
  }

  return queue;
};
