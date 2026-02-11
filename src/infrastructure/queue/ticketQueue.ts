import { Queue } from 'bullmq';
import { redisConfig } from './connection';

export const ticketQueue = new Queue('ticket-processing', {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: false,
    removeOnFail: false,
  },
});