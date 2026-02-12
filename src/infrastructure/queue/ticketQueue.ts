import { Queue } from 'bullmq';
import { redisConfig } from './connection';

let queue: Queue | null = null;

export const getTicketQueue = () => {
  if (process.env.NODE_ENV === 'test') {
    throw new Error('Queue should not be used in test environment');
  }

  if (!queue) {
    if (!redisConfig) {
      throw new Error('Redis config missing');
    }

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
